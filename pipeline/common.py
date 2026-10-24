"""Shared helpers: HTTP with retries, sourced datapoints, safe merging, JSON output."""
from __future__ import annotations

import datetime as _dt
import json
import os
import time
from pathlib import Path
from typing import Any

import requests

UA = "StumpLeagueBot/0.1 (nonpartisan civic data; contact via project README)"
DATA_DIR = Path(os.environ.get("STUMP_DATA_DIR", Path(__file__).resolve().parent.parent / "data"))


class FetchError(RuntimeError):
    pass


def today() -> str:
    return _dt.date.today().isoformat()


def http_get(url: str, params: dict | None = None, *, tries: int = 3, timeout: int = 30) -> requests.Response:
    last = None
    for i in range(tries):
        try:
            r = requests.get(url, params=params, timeout=timeout, headers={"User-Agent": UA})
            if r.status_code == 404:
                return r
            if r.status_code == 429:
                time.sleep(int(r.headers.get("Retry-After", 5)))
                continue
            r.raise_for_status()
            return r
        except requests.RequestException as e:  # network, TLS, 5xx
            last = e
            time.sleep(2 ** i)
    raise FetchError(f"GET {url} failed after {tries} tries: {last}")


def get_json(url: str, params: dict | None = None) -> Any:
    r = http_get(url, params)
    if r.status_code == 404:
        return None
    return r.json()


def datapoint(value: Any, *, source_url: str, publisher: str, verified: bool = False, note: str | None = None) -> dict:
    """Every number on the site travels with its source. Imports are never auto-verified:
    official feeds are marked verified=True only by the reviewer workflow (or a feed allowlist)."""
    d = {"value": value, "source_url": source_url, "publisher": publisher, "retrieved_at": today(), "verified": verified}
    if note:
        d["note"] = note
    return d


def merge_safe(old: dict | None, new: dict | None) -> dict | None:
    """Never let an empty or failed pull overwrite a value a reviewer verified."""
    if new is None or new.get("value") in (None, "", [], {}):
        return old
    if old and old.get("verified") and old.get("value") != new.get("value"):
        # Keep the verified value; queue the change for review instead of silently replacing it.
        kept = dict(old)
        kept["pending_update"] = new
        return kept
    return new


def write_json(name: str, obj: Any) -> Path:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    p = DATA_DIR / name
    p.write_text(json.dumps(obj, indent=1, sort_keys=True, ensure_ascii=False))
    return p


def read_json(name: str, default: Any = None) -> Any:
    p = DATA_DIR / name
    return json.loads(p.read_text()) if p.exists() else default
