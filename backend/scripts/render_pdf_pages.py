"""
PDF Page Renderer

Reads a Base64-encoded PDF from stdin.
Renders each page as a JPEG image at 150 DPI using PyMuPDF.

Outputs JSON to stdout:
{
  "pages": [
    { "index": 0, "width": 1240, "height": 1754, "base64": "..." },
    ...
  ],
  "warnings": [...]
}
"""

import sys
import json
import base64

import fitz  # PyMuPDF

DPI = 150
MAT = fitz.Matrix(DPI / 72, DPI / 72)  # 72 is the default PDF point density


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
    pages: list[dict] = []

    try:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        for page_num in range(len(doc)):
            try:
                page = doc[page_num]
                pix = page.get_pixmap(matrix=MAT, alpha=False)
                jpeg_bytes = pix.tobytes("jpeg", jpg_quality=85)
                pages.append({
                    "index": page_num,
                    "width": pix.width,
                    "height": pix.height,
                    "base64": base64.b64encode(jpeg_bytes).decode(),
                })
                sys.stderr.write(f"[render] Page {page_num + 1}: {pix.width}x{pix.height}\n")
            except Exception as e:
                warnings.append(f"Page {page_num + 1} render failed: {e}")
        doc.close()
    except Exception as e:
        print(json.dumps({"error": f"PDF open failed: {e}"}), file=sys.stderr)
        sys.exit(1)

    result: dict = {"pages": pages}
    if warnings:
        result["warnings"] = warnings

    print(json.dumps(result))


if __name__ == "__main__":
    main()
