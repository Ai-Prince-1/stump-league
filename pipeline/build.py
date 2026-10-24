"""Nightly build: pull each feed, merge safely, and write data/*.json plus a manifest
the site's Data Feeds table reads. One failing feed never stops the others."""
from __future__ import annotations

import argparse
import json
import traceback
from pathlib import Path

from .common import read_json, today, write_json, merge_safe
from . import sources as S

CONFIG = json.loads((Path(__file__).resolve().parent.parent / "config.json").read_text())
CYCLE = CONFIG["cycle"]
CONGRESS = CONFIG["congress"]
CEL_CONGRESS = CONFIG["cel_congress"]   # CEL scores publish after a Congress ends
VOTE_YEARS = CONFIG["vote_years"]


def run_step(manifest: dict, name: str, fn):
    import time
    t0 = time.monotonic()
    print(f"[{name}] starting", flush=True)
    try:
        result = fn()
        manifest[name] = {"state": "live", "last": today(), "records": len(result or {}), "seconds": round(time.monotonic() - t0)}
        print(f"[{name}] ok: {len(result or {})} records in {round(time.monotonic() - t0)}s", flush=True)
        return result
    except Exception as e:  # keep going; the site shows the feed as stale
        prev = manifest.get(name, {})
        manifest[name] = {**prev, "state": "error", "error": f"{type(e).__name__}: {e}"[:300], "checked": today()}
        traceback.print_exc()
        return None


def merge_file(fname: str, new: dict | None):
    if not new:
        return
    old = read_json(fname, {}) or {}
    merged = {k: merge_safe(old.get(k), v) if isinstance(v, dict) and "value" in v else v for k, v in new.items()}
    for k in old.keys() - new.keys():
        merged[k] = old[k]
    write_json(fname, merged)


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", nargs="*", help="feeds to run: members zips cel cel_state fec votes senate_votes bills factchecks")
    ap.add_argument("--bioguide", nargs="*", help="limit member-level feeds to these IDs")
    ap.add_argument("--scope", choices=["pilot", "all"], default=CONFIG.get("scope", "pilot"),
                    help="pilot = races in config.json (fits free API limits); all = every member of Congress")
    a = ap.parse_args(argv)
    want = set(a.only or ["members", "zips", "cel", "cel_state", "fec", "votes", "senate_votes", "bills", "factchecks"])
    manifest = read_json("manifest.json", {}) or {}

    members = read_json("members.json")
    if "members" in want:
        members = run_step(manifest, "members", S.fetch_legislators) or members
        if members:
            write_json("members.json", members)
    members = members or {}
    pilot = CONFIG["pilot"]
    if a.bioguide:
        ids = a.bioguide
    elif a.scope == "pilot":
        ids = pilot["bioguide"]
    else:
        ids = list(members)
    scope = {b: members[b] for b in ids if b in members}
    people = pilot["people"] if a.scope == "pilot" and not a.bioguide else [m["name"] for m in scope.values()]
    fec_ids = pilot["fec_ids"] if a.scope == "pilot" and not a.bioguide else [c for m in scope.values() for c in m.get("fec_ids", [])]

    if "zips" in want:
        z = run_step(manifest, "zips", S.fetch_zip_districts)
        if z:
            write_json("zip_districts.json", z)
    if "cel" in want:
        merge_file("cel.json", run_step(manifest, "cel", lambda: S.fetch_cel(CEL_CONGRESS)))
    if "cel_state" in want:
        def cel_state():
            out = {}
            for st in CONFIG.get("states", []):
                out.update(S.fetch_cel_state(st, *CONFIG["cel_state_term"]))
            return out
        merge_file("cel_state.json", run_step(manifest, "cel_state", cel_state))
    if "fec" in want:
        def fec():
            meta = {}
            for st in CONFIG.get("states", []):          # every federal candidate the FEC lists in these states
                meta.update(S.fetch_fec_state_candidates(st, CYCLE))
            extra = read_json("candidates.json", {}) or {}   # anyone else, as {fec_id: {...}}
            ids = list(dict.fromkeys(fec_ids + [k for k, v in meta.items() if v.get("has_raised_funds") is not False] + list(extra)))
            return S.fetch_fec(ids, CYCLE, meta)
        merge_file("fec.json", run_step(manifest, "fec", fec))
    if "bills" in want:
        def bills():
            return {b: dp for b, m in scope.items() if (dp := S.fetch_bipartisanship(b, m["party"], CONGRESS))}
        merge_file("bipartisanship.json", run_step(manifest, "bills", bills))
    if "factchecks" in want:
        def fc():
            if not S.GOOGLE_FACTCHECK_KEY:
                raise RuntimeError("GOOGLE_FACTCHECK_KEY not set; add it as a repository secret")
            return {name: dp for name in people if (dp := S.fetch_factchecks(name))}
        merge_file("factchecks.json", run_step(manifest, "factchecks", fc))

    if "votes" in want:   # last: the first run downloads every roll call of the Congress
        write_json("manifest.json", manifest)
        merge_file("attendance.json", run_step(manifest, "votes", lambda: S.fetch_house_attendance(VOTE_YEARS)))
        if "votes" in manifest:
            manifest["votes"]["progress"] = dict(S.VOTE_PROGRESS)
    if "senate_votes" in want:
        lis = {m["lis"]: b for b, m in members.items() if m.get("lis")}
        merge_file("senate_attendance.json", run_step(manifest, "senate_votes",
                   lambda: S.fetch_senate_attendance(CONGRESS, CONFIG.get("senate_sessions", [1, 2]), lis)))
        if "senate_votes" in manifest:
            manifest["senate_votes"]["progress"] = dict(S.SENATE_PROGRESS)
    manifest["_run"] = {"date": today(), "scope": a.scope}
    write_json("manifest.json", manifest)
    for k, v in manifest.items():
        if not k.startswith("_"):
            print(f"{k:12s} {v.get('state', ''):6s} {v.get('records', '')} {v.get('error', '')[:160]}")


if __name__ == "__main__":
    main()
