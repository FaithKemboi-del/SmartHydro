"""
Quick check for Smart Hydro Supabase connection.
Run: py check_supabase.py
"""

import os
import socket
from urllib.parse import urlparse

from dotenv import load_dotenv


def main():
    load_dotenv()
    url = (os.getenv("SUPABASE_URL") or "").strip()
    key = (os.getenv("SUPABASE_KEY") or "").strip()

    print("=== Smart Hydro Supabase check ===")
    print(f".env file loaded from: {os.path.abspath('.env') if os.path.exists('.env') else 'NOT FOUND'}")
    print()

    if not url or not key:
        print("FAIL: SUPABASE_URL or SUPABASE_KEY is missing in .env")
        return

    if "your-project-ref" in url or "example" in url:
        print("FAIL: SUPABASE_URL is still the placeholder.")
        print(f"Current URL: {url}")
        print("Replace it with your real Project URL from Supabase → Project Settings → API")
        return

    if "your-supabase" in key:
        print("FAIL: SUPABASE_KEY is still the placeholder.")
        return

    parsed = urlparse(url)
    host = parsed.hostname or ""

    print(f"URL: {url}")
    print(f"Host: {host}")
    print(f"Key starts with: {key[:18]}...")
    print()

    if parsed.scheme != "https":
        print("FAIL: URL must start with https://")
        return

    if not host.endswith(".supabase.co"):
        print("FAIL: Host must end with .supabase.co")
        print("Do NOT use app.supabase.com dashboard links.")
        return

    if "/rest/v1" in url or "/project/" in url:
        print("FAIL: URL has an extra path. Use only https://xxxx.supabase.co")
        return

    try:
        infos = socket.getaddrinfo(host, 443)
        print(f"DNS OK: resolved {host} -> {infos[0][4][0]}")
        print()
        print("Your URL is reachable by DNS.")
        print("If simulator still fails, run fix_rls.sql in Supabase SQL Editor, then:")
        print("  py simulator.py")
    except socket.gaierror as error:
        print("DNS FAIL: Windows cannot resolve this host.")
        print(f"Details: {error}")
        print()
        print("Fix checklist:")
        print("1. Open Supabase dashboard → Project Settings → API")
        print("2. Copy Project URL exactly (example: https://abcdefghijk.supabase.co)")
        print("3. Paste into .env as SUPABASE_URL=...")
        print("4. Save the file")
        print("5. Run this checker again: py check_supabase.py")
        print()
        print("Also check internet/Wi-Fi and that you didn't type the URL wrong.")


if __name__ == "__main__":
    main()
