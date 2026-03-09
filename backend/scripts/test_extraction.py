#!/usr/bin/env python3
"""
test_extraction.py -- Script de teste rapido para a extracao de dominios.

Uso:
    python test_extraction.py <caminho_do_pdf>

Exemplo:
    python test_extraction.py "C:/Users/Tupay/Downloads/anatel.pdf"

O script:
  1. Le o PDF e converte para base64
  2. Gera um JWT de dev e autentica no backend
  3. Envia para http://localhost:4001
  4. Salva automaticamente:
     - candidates.txt    (lista de candidatos)
     - candidates.zip    (imagens das celulas)
"""

import sys
import base64
import json
import urllib.request
import urllib.error
import os
import time
import hmac
import hashlib

# Force UTF-8 output on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BACKEND_URL = "http://localhost:4001/api/ai/extract-domains-from-file"
OUTPUT_DIR = r"C:\Users\Tupay\Projects\script\extraction-tests"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# JWT_SECRET from backend/.env -- used only for local dev testing
JWT_SECRET = "473229b9cfe8011181d0ceec8261eca5"


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()


def make_dev_jwt() -> str:
    """Generate a minimal valid JWT for local dev testing."""
    header = _b64url(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload = _b64url(json.dumps({
        "userId": "dev-test-user",
        "tenantId": "dev-tenant",
        "role": "admin",
        "zabbix_hostgroup_ids": [],
        "iat": int(time.time()),
        "exp": int(time.time()) + 3600,
    }).encode())
    sig_input = f"{header}.{payload}".encode()
    sig = hmac.new(JWT_SECRET.encode(), sig_input, hashlib.sha256).digest()
    return f"{header}.{payload}.{_b64url(sig)}"


def main():
    if len(sys.argv) < 2:
        print("Uso: python test_extraction.py <caminho_do_pdf>")
        sys.exit(1)

    pdf_path = sys.argv[1]
    if not os.path.exists(pdf_path):
        print(f"Erro: arquivo nao encontrado: {pdf_path}")
        sys.exit(1)

    print(f"[PDF] Lendo: {pdf_path}")
    with open(pdf_path, "rb") as f:
        pdf_bytes = f.read()

    b64 = base64.b64encode(pdf_bytes).decode()
    data_uri = f"data:application/pdf;base64,{b64}"
    print(f"      {len(pdf_bytes):,} bytes  |  base64: {len(b64):,} chars")

    token = make_dev_jwt()
    payload = json.dumps({"fileDataUri": data_uri}).encode("utf-8")

    print(f"\n[HTTP] Enviando para {BACKEND_URL} ...")
    req = urllib.request.Request(
        BACKEND_URL,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=300) as resp:
            body = resp.read()
    except urllib.error.HTTPError as e:
        print(f"[ERROR] HTTP {e.code}: {e.read().decode()}")
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"[ERROR] Conexao falhou: {e.reason}")
        print("        Verifique se o backend esta rodando em http://localhost:4001")
        sys.exit(1)

    result = json.loads(body)

    # -- Save full extracted text --
    full_text = result.get("extractedText", "")
    if full_text:
        full_txt_path = os.path.join(OUTPUT_DIR, "full_text.txt")
        with open(full_txt_path, "w", encoding="utf-8") as f:
            f.write(full_text)
        print(f"\n[OK] full_text.txt salvo: {full_txt_path}  ({len(full_text.splitlines())} linhas)")

    # -- Save extracted domains list --
    domains = result.get("domains") or []
    if domains:
        domains_path = os.path.join(OUTPUT_DIR, "domains.txt")
        with open(domains_path, "w", encoding="utf-8") as f:
            f.write("\n".join(sorted(domains)))
        print(f"[OK] domains.txt salvo: {domains_path}  ({len(domains)} domínios)")

    # -- Save candidates.txt (legacy / debug) --
    candidates_text = result.get("candidatesText", "")  # not returned anymore
    if candidates_text:
        txt_path = os.path.join(OUTPUT_DIR, "candidates.txt")
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(candidates_text)
        print(f"[OK] candidates.txt salvo: {txt_path}")

    # -- Save candidates.zip --
    zip_b64 = result.get("candidatesZipBase64")
    if zip_b64:
        zip_bytes = base64.b64decode(zip_b64)
        zip_path = os.path.join(OUTPUT_DIR, "candidates.zip")
        with open(zip_path, "wb") as f:
            f.write(zip_bytes)
        print(f"[OK] candidates.zip salvo: {zip_path}  ({len(zip_bytes):,} bytes)")
    else:
        print("[WARN] Nenhum ZIP retornado")

    # -- Summary --
    domains = result.get("domains") or []
    print(f"\n[RESUMO]")
    print(f"  domains    : {len(domains)}")
    print(f"  ipv4       : {len(result.get('ipv4') or [])}")
    print(f"  ipv6       : {len(result.get('ipv6') or [])}")
    print(f"  cidrs      : {len(result.get('cidrs') or [])}")


if __name__ == "__main__":
    main()
