"""
PDF Text Extraction + Broken Domain Detection (Tier 1 + Tier 2)

Reads a Base64-encoded PDF from stdin.
1. Loads the Public Suffix List (PSL) from public_suffix_list.dat.
2. Extracts full text using PyMuPDF + pdfplumber (merged union).
3. Detects broken domain candidates:
   - Tier 1 (high confidence): w1 is not a domain, w1+w2 is a complete domain.
   - Tier 2 (lower confidence): w1 ends with a partial TLD, w2 is the missing tail.
4. Crops a PNG image for each candidate.
5. Bundles everything into a ZIP:
   - candidates.txt
   - tier1/<image>.png
   - tier2/<image>.png
6. Outputs JSON to stdout:
   {
     "text": "<merged full text>",
     "candidates":      [{"fragment":..., "joined":..., "page":...}],
     "candidates_tier2":[{"fragment":..., "joined":..., "page":...}],
     "zip_base64": "<base64-encoded ZIP>",
     "warnings": [...]
   }
"""

import sys
import json
import base64
import io
import re
import zipfile
import os

import fitz       # PyMuPDF
import pdfplumber

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PSL_PATH = os.path.join(SCRIPT_DIR, "public_suffix_list.dat")

# ──────────────────────────────────────────────
# Load Public Suffix List
# ──────────────────────────────────────────────

def load_psl(path: str) -> tuple[set[str], set[str]]:
    """
    Parse the Public Suffix List.
    Returns (simple_tlds, compound_tlds):
      simple_tlds   — single-level: 'com', 'net', 'app', 'br' ...  (1439 entries)
      compound_tlds — two-level:    'com.br', 'co.uk', 'vercel.app' ... (5265 entries)
    Skips wildcard (*) and exception (!) lines.
    Includes both ICANN and private-domain sections.
    """
    simple: set[str] = set()
    compound: set[str] = set()
    try:
        with open(path, encoding="utf-8") as f:
            for line in f:
                line = line.strip().lower()
                if not line or line.startswith("//") or line.startswith("*") or line.startswith("!"):
                    continue
                if "." not in line:
                    simple.add(line)
                elif line.count(".") == 1:
                    compound.add(line)
                # 3-level+ suffixes are rare and expensive to check; skip for now
    except FileNotFoundError:
        sys.stderr.write(f"[WARN] PSL file not found at {path}; falling back to hardcoded list\n")
        # Minimal fallback
        simple = {"com","net","org","br","tk","ml","ga","cf","gq","xyz","club","site",
                  "online","pro","app","top","cc","click","live","me","shop","vip","info",
                  "biz","io","co","tv","us","uk","de","ru","cn","gratis","store","lat",
                  "uno","mobi","icu","monster","fun","pw","ws","name","tel","ninja","guru"}
        compound = {"com.br","co.uk","org.br","net.br","edu.br","gov.br","com.ar","co.ar"}
    return simple, compound


SIMPLE_TLDS, COMPOUND_TLDS = load_psl(PSL_PATH)

DOMAIN_CHAR_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9.\-]*$")

# ──────────────────────────────────────────────
# Domain helpers
# ──────────────────────────────────────────────

def is_domain_like(text: str, min_len: int = 2) -> bool:
    """Text contains only valid domain chars and meets minimum length."""
    return len(text) >= min_len and bool(DOMAIN_CHAR_RE.match(text))


def is_complete_domain(text: str) -> bool:
    """
    Return True if text looks like a fully-formed domain:
      - ends with a simple TLD ('vercel.app', 'google.com')
      - OR ends with a compound TLD ('meusite.com.br', 'bbc.co.uk')
    """
    t = text.lower()
    parts = t.split(".")
    if len(parts) < 2:
        return False
    if not DOMAIN_CHAR_RE.match(t):
        return False
    # simple TLD
    if parts[-1] in SIMPLE_TLDS:
        return True
    # compound TLD (last two parts form a suffix like com.br)
    if len(parts) >= 3 and f"{parts[-2]}.{parts[-1]}" in COMPOUND_TLDS:
        return True
    return False


def tld_prefix_split(t1: str, t2: str) -> str | None:
    """
    Tier 2 check: t1 ends with a PARTIAL TLD, t2 completes it.

    Handles two cases:

    Case A — simple TLD split:
      t1='vercel.ap', t2='p'
      tld_prefix='ap', candidate='app' → in SIMPLE_TLDS ✓
      → returns 'vercel.app'

    Case B — compound TLD split:
      t1='comandotorrentsgratishd.com.b', t2='r'
      compound_prefix='com.b', candidate_compound='com.br' → in COMPOUND_TLDS ✓
      → returns 'comandotorrentsgratishd.com.br'

    Returns the joined complete domain, or None if criteria not met.
    """
    # ── Case D: t2 itself has a dot (e.g. t1="wurthbrasil.lojavirtualnuvem.co", t2="m.br") ──
    # The t1 trailing segment + t2_head forms a simple TLD ("co"+"m"="com"),
    # and t2_head+"."+t2_tail forms a valid compound TLD ("com.br").
    _t2_dot = t2.find('.')
    if _t2_dot > 0 and t2[:_t2_dot].isalpha() and t2[_t2_dot + 1:].isalpha() and 2 <= len(t2[_t2_dot + 1:]) <= 4:
        if '.' in t1:
            _tld_prefix = t1[t1.rfind('.') + 1:].lower()
            _t2_head = t2[:_t2_dot].lower()
            _t2_tail = t2[_t2_dot + 1:].lower()
            _simple = _tld_prefix + _t2_head          # e.g. "co" + "m" = "com"
            _compound = _simple + '.' + _t2_tail      # e.g. "com.br"
            if _simple in SIMPLE_TLDS and _compound in COMPOUND_TLDS:
                combined = t1 + t2
                if DOMAIN_CHAR_RE.match(combined):
                    return combined

    # t2 must be short (1–4 chars) and only lowercase letters (tail of a TLD)
    if not (1 <= len(t2) <= 4 and t2.isalpha() and t2.islower()):
        return None

    # t1 must contain at least one dot
    if "." not in t1:
        return None

    parts = t1.lower().split(".")
    last_dot = t1.rfind(".")
    tld_prefix = t1[last_dot + 1:]  # last segment, e.g. "ap" or "b"

    if not tld_prefix:
        return None

    # ── Case A: simple TLD split (prefix is NOT a valid TLD) ──
    if tld_prefix.lower() not in SIMPLE_TLDS:
        candidate_tld = tld_prefix.lower() + t2.lower()
        if candidate_tld in SIMPLE_TLDS:
            combined = t1 + t2
            if DOMAIN_CHAR_RE.match(combined):
                return combined

    # ── Case B: compound TLD split (e.g. t1 ends in "com.b", t2="r" → "com.br") ──
    if len(parts) >= 3:
        compound_prefix = f"{parts[-2]}.{parts[-1]}"
        candidate_compound = compound_prefix + t2.lower()
        if (
            candidate_compound in COMPOUND_TLDS
            and compound_prefix not in COMPOUND_TLDS
        ):
            combined = t1 + t2
            if DOMAIN_CHAR_RE.match(combined):
                return combined

    # ── Case C: overlapping TLD (prefix IS a valid TLD, but prefix+t2 is a DIFFERENT valid TLD) ──
    # e.g. "co" is valid (.co Colombia), "co"+"m" = "com" is also valid → Tier 2 candidate
    if tld_prefix.lower() in SIMPLE_TLDS:
        candidate_tld = tld_prefix.lower() + t2.lower()
        if candidate_tld in SIMPLE_TLDS and candidate_tld != tld_prefix.lower():
            combined = t1 + t2
            if DOMAIN_CHAR_RE.match(combined):
                return combined

    return None


# ──────────────────────────────────────────────
# Candidate detection (per page, single pass)
# ──────────────────────────────────────────────

SPATIAL_X_TOLERANCE = 60   # pts — max x0 difference (same column)
SPATIAL_Y_MULTIPLIER = 2.5 # max vertical gap as a multiple of line height


def find_candidates_on_page(
    page,
    page_num: int,
) -> tuple[list[dict], list[dict]]:
    """
    Single pass over pdfplumber words.
    Returns (tier1_candidates, tier2_candidates).

    Tier 1 (high confidence):
      w1 is NOT a complete domain, w1+w2 IS a complete domain,
      w2 has length ≥ 2 (so it's a meaningful suffix, not just a TLD tail).

    Tier 2 (lower confidence):
      w1 ends with a partial TLD prefix, w2 (1–4 letters) completes the TLD.
    """
    tier1: list[dict] = []
    tier2: list[dict] = []
    seen_pairs: set[tuple] = set()   # avoid double-classifying same word pair

    words = page.extract_words(x_tolerance=3, y_tolerance=3)

    for i in range(len(words) - 1):
        w1 = words[i]
        w2 = words[i + 1]

        t1 = w1["text"].strip()
        t2 = w2["text"].strip()

        pair_key = (page_num, i)
        if pair_key in seen_pairs:
            continue

        # ── Spatial guards (apply to both tiers) ──
        if abs(w1["x0"] - w2["x0"]) > SPATIAL_X_TOLERANCE:
            continue
        line_height = max(w1["bottom"] - w1["top"], 4)
        if not (w1["bottom"] <= w2["top"] <= w1["bottom"] + line_height * SPATIAL_Y_MULTIPLIER):
            continue

        # ── Case D: entire .TLD on next line (e.g. "negiduwegurobeja" + ".info") ──
        # w2 starts with '.' — standard TLD split at the dot itself.
        # High confidence → Tier 1.
        if (
            t2.startswith('.')
            and is_domain_like(t1, min_len=3)
            and not is_complete_domain(t1)
            and is_complete_domain(t1 + t2)
        ):
            pad = 8
            bbox = (
                min(w1["x0"], w2["x0"]) - pad,
                w1["top"] - pad,
                max(w1["x1"], w2["x1"]) + pad,
                w2["bottom"] + pad,
            )
            tier1.append({
                "fragment": f"{t1}\n{t2}",
                "joined": t1 + t2,
                "page": page_num,
                "bbox": bbox,
            })
            seen_pairs.add(pair_key)
            continue

        # ── Tier 1 ──
        if (
            is_domain_like(t1, min_len=2)
            and is_domain_like(t2, min_len=2)
            and not is_complete_domain(t1)
            and is_complete_domain(t1 + t2)
        ):
            pad = 8
            bbox = (
                min(w1["x0"], w2["x0"]) - pad,
                w1["top"] - pad,
                max(w1["x1"], w2["x1"]) + pad,
                w2["bottom"] + pad,
            )
            tier1.append({
                "fragment": f"{t1}\n{t2}",
                "joined": t1 + t2,
                "page": page_num,
                "bbox": bbox,
            })
            seen_pairs.add(pair_key)
            continue

        # ── Tier 2 ──
        # Note: we intentionally do NOT guard with `not is_complete_domain(t1)` here,
        # because Case C needs to fire when t1 ends with a valid BUT shorter TLD
        # (e.g. ".co") and t2 completes a DIFFERENT longer TLD (e.g. ".com").
        # tld_prefix_split() has its own guards that prevent false positives.
        if is_domain_like(t1, min_len=3):
            joined = tld_prefix_split(t1, t2)
            if joined:
                pad = 8
                bbox = (
                    min(w1["x0"], w2["x0"]) - pad,
                    w1["top"] - pad,
                    max(w1["x1"], w2["x1"]) + pad,
                    w2["bottom"] + pad,
                )
                tier2.append({
                    "fragment": f"{t1}\n{t2}",
                    "joined": joined,
                    "page": page_num,
                    "bbox": bbox,
                })
                seen_pairs.add(pair_key)

        # ── Tier 2 Case E: label-split (both t1 and t2 look like complete domains) ──
        # e.g. "megacine-os-melhores-filmes.so" + "ftonic.com.br"
        #   → "megacine-os-melhores-filmes.softonic.com.br"
        # Fires when:
        #   1. t1 IS a complete domain (ends in short ≤3-letter CcTLD like .so, .to, .co, .me)
        #   2. t2 IS a complete domain (e.g. ftonic.com.br) and doesn't start with '.'
        #   3. t1+t2 forms a DIFFERENT valid domain with ≥3 dot-parts (more complex than t1 alone)
        if (
            is_complete_domain(t1)
            and is_complete_domain(t2)
            and not t2.startswith('.')
            and pair_key not in seen_pairs
        ):
            tld_suffix = t1[t1.rfind('.') + 1:].lower()
            joined_candidate = t1 + t2
            if (
                len(tld_suffix) <= 3                       # short CcTLD like .so, .to, .me
                and is_complete_domain(joined_candidate)
                and joined_candidate.count('.') >= 2       # must have ≥3 parts
                and DOMAIN_CHAR_RE.match(joined_candidate)
            ):
                pad = 8
                bbox = (
                    min(w1["x0"], w2["x0"]) - pad,
                    w1["top"] - pad,
                    max(w1["x1"], w2["x1"]) + pad,
                    w2["bottom"] + pad,
                )
                tier2.append({
                    "fragment": f"{t1}\n{t2}",
                    "joined": joined_candidate,
                    "page": page_num,
                    "bbox": bbox,
                })
                seen_pairs.add(pair_key)

        # ── Tier 2 Case F: t1 complete + t2 starts with '.' extending to compound TLD ──
        # e.g. "recarga.maxfriorefrigeracao.com" + ".br"
        #   → "recarga.maxfriorefrigeracao.com.br"
        # Fires independently of Case D (which requires NOT is_complete_domain(t1)).
        # Here t1 IS complete (ends in .com / .net / etc.) and t2 is purely a country extension.
        if (
            t2.startswith('.')
            and is_domain_like(t1, min_len=3)
            and is_complete_domain(t1)
            and pair_key not in seen_pairs
        ):
            joined_candidate = t1 + t2
            t2_ext = t2[1:].lower()   # e.g. "br"
            if (
                is_complete_domain(joined_candidate)
                and joined_candidate.count('.') > t1.count('.')
                and any(joined_candidate.endswith('.' + ct) for ct in COMPOUND_TLDS)
            ):
                if DOMAIN_CHAR_RE.match(joined_candidate):
                    pad = 8
                    bbox = (
                        min(w1["x0"], w2["x0"]) - pad,
                        w1["top"] - pad,
                        max(w1["x1"], w2["x1"]) + pad,
                        w2["bottom"] + pad,
                    )
                    tier2.append({
                        "fragment": f"{t1}\n{t2}",
                        "joined": joined_candidate,
                        "page": page_num,
                        "bbox": bbox,
                    })
                    seen_pairs.add(pair_key)

    return tier1, tier2


# ──────────────────────────────────────────────
# Image cropping (PyMuPDF — no coord conversion needed)
# ──────────────────────────────────────────────

def crop_candidate_image_fitz(fitz_doc, page_num: int, plumb_bbox: tuple, _page_height: float = 0) -> bytes:
    """
    Both pdfplumber and PyMuPDF use y-from-top, so bbox coords pass through directly.
    """
    px0, p_top, px1, p_bottom = plumb_bbox
    clip = fitz.Rect(px0, p_top, px1, p_bottom)
    fitz_page = fitz_doc[page_num]
    mat = fitz.Matrix(2, 2)   # 2× zoom ≈ 144 DPI — sufficient for text, smaller file
    pix = fitz_page.get_pixmap(matrix=mat, clip=clip, alpha=False)
    return pix.tobytes("jpg", jpg_quality=80)


# ──────────────────────────────────────────────
# ZIP bundling
# ──────────────────────────────────────────────

def create_candidates_zip(
    tier1: list[dict], images1: dict,
    tier2: list[dict], images2: dict,
) -> bytes:
    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
        # ── candidates.txt (both tiers) ──
        lines: list[str] = ["=== TIER 1 (alta confiança) ==="]
        for i, c in enumerate(tier1):
            frag = c["fragment"].replace("\n", " + ")
            lines.append(f"[{i+1:03d}] Page {c['page']+1:3d}:  {frag}  →  {c['joined']}")
        lines += ["", "=== TIER 2 (confiança média — TLD parcialmente cortado) ==="]
        for i, c in enumerate(tier2):
            frag = c["fragment"].replace("\n", " + ")
            lines.append(f"[{i+1:03d}] Page {c['page']+1:3d}:  {frag}  →  {c['joined']}")
        zf.writestr("candidates.txt", "\n".join(lines))

        # ── Tier 1 images ──
        for i, c in enumerate(tier1):
            png = images1.get(i)
            if png:
                safe = re.sub(r"[^\w.\-]", "_", c["joined"][:40])
                zf.writestr(f"tier1/candidate_{i+1:03d}_p{c['page']+1}_{safe}.jpg", png)

        # ── Tier 2 images ──
        for i, c in enumerate(tier2):
            png = images2.get(i)
            if png:
                safe = re.sub(r"[^\w.\-]", "_", c["joined"][:40])
                zf.writestr(f"tier2/candidate_{i+1:03d}_p{c['page']+1}_{safe}.jpg", png)

    zip_buf.seek(0)
    return zip_buf.read()


# ──────────────────────────────────────────────
# Full text extraction
# ──────────────────────────────────────────────

def extract_with_pymupdf(pdf_bytes: bytes) -> list[str]:
    lines: list[str] = []
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    for page in doc:
        text = page.get_text()
        if text:
            lines.extend(text.splitlines())
    doc.close()
    return lines


def extract_with_pdfplumber(pdf_bytes: bytes) -> list[str]:
    lines: list[str] = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                lines.extend(text.splitlines())
    return lines


def merge_lines(lines_a: list[str], lines_b: list[str]) -> str:
    seen: set[str] = set()
    merged: list[str] = []
    for line in lines_a + lines_b:
        stripped = line.strip()
        if stripped and stripped not in seen:
            seen.add(stripped)
            merged.append(stripped)
    return "\n".join(merged)


# ──────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────

def main() -> None:
    b64_data = sys.stdin.read().strip()
    if not b64_data:
        print(json.dumps({"error": "No input received on stdin"}), file=sys.stderr)
        sys.exit(1)
    try:
        pdf_bytes = base64.b64decode(b64_data)
    except Exception as e:
        print(json.dumps({"error": f"Base64 decode failed: {e}"}), file=sys.stderr)
        sys.exit(1)

    warnings: list[str] = []

    # ── 1. Full text extraction ──
    try:
        pymupdf_lines = extract_with_pymupdf(pdf_bytes)
    except Exception as e:
        pymupdf_lines = []
        warnings.append(f"PyMuPDF error: {e}")

    try:
        plumber_lines = extract_with_pdfplumber(pdf_bytes)
    except Exception as e:
        plumber_lines = []
        warnings.append(f"pdfplumber error: {e}")

    merged_text = merge_lines(pymupdf_lines, plumber_lines)

    # ── 2. Broken domain candidate detection ──
    all_t1: list[dict] = []
    all_t2: list[dict] = []
    images1: dict[int, bytes] = {}
    images2: dict[int, bytes] = {}
    zip_base64: str | None = None

    try:
        fitz_doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for page_num, page in enumerate(pdf.pages):
                page_height = float(page.height)
                t1, t2 = find_candidates_on_page(page, page_num)

                for c in t1:
                    idx = len(all_t1)
                    try:
                        images1[idx] = crop_candidate_image_fitz(fitz_doc, page_num, c["bbox"], page_height)
                    except Exception as e:
                        warnings.append(f"Tier1 crop failed p{page_num+1}: {e}")
                    all_t1.append(c)

                for c in t2:
                    idx = len(all_t2)
                    try:
                        images2[idx] = crop_candidate_image_fitz(fitz_doc, page_num, c["bbox"], page_height)
                    except Exception as e:
                        warnings.append(f"Tier2 crop failed p{page_num+1}: {e}")
                    all_t2.append(c)

        fitz_doc.close()
        print(f"[Python] Tier1={len(all_t1)} Tier2={len(all_t2)} | images={len(images1)}+{len(images2)}", file=sys.stderr)

        if all_t1 or all_t2:
            zip_bytes = create_candidates_zip(all_t1, images1, all_t2, images2)
            zip_base64 = base64.b64encode(zip_bytes).decode()

    except Exception as e:
        warnings.append(f"Candidate detection error: {e}")

    # Slim candidates for JSON
    def slim(c: dict) -> dict:
        return {"fragment": c["fragment"], "joined": c["joined"], "page": c["page"]}

    result: dict = {
        "text": merged_text,
        "candidates":       [slim(c) for c in all_t1],
        "candidates_tier2": [slim(c) for c in all_t2],
        "zip_base64": zip_base64,
    }
    if warnings:
        result["warnings"] = warnings

    print(json.dumps(result))


if __name__ == "__main__":
    main()
