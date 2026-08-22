"""Shared HTTP client with retries and proper headers."""
import time
import requests
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
    "Accept-Language": "vi-VN,vi;q=0.9,en;q=0.8",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}


def get(url, timeout=25, retries=3, verify=False, **kw):
    """GET with retries."""
    kw.setdefault("headers", HEADERS)
    kw.setdefault("timeout", timeout)
    kw.setdefault("verify", verify)
    last = None
    for attempt in range(retries):
        try:
            r = requests.get(url, **kw)
            if r.status_code == 200:
                return r
            last = f"HTTP {r.status_code}"
        except Exception as e:
            last = f"{type(e).__name__}: {e}"
        time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"Failed to fetch {url}: {last}")