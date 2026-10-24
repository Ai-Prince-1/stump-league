"""One importer per official source. Each returns plain dicts keyed by bioguide ID (or ZIP),
with every value wrapped as a sourced datapoint. Parsers are separate from fetchers so they
can be tested against saved samples."""
from __future__ import annotations

import csv
import io
import os
import xml.etree.ElementTree as ET
from collections import defaultdict

import yaml

from .common import datapoint, get_json, http_get
from . import transforms as T

API_DATA_GOV_KEY = os.environ.get("API_DATA_GOV_KEY") or "DEMO_KEY"   # works for Congress.gov and OpenFEC
GOOGLE_FACTCHECK_KEY = os.environ.get("GOOGLE_FACTCHECK_KEY") or None

# ---------------------------------------------------------------- members
LEGISLATORS_URL = "https://raw.githubusercontent.com/unitedstates/congress-legislators/main/legislators-current.yaml"


def parse_legislators(yaml_text: str) -> dict:
    out = {}
    for l in yaml.safe_load(yaml_text):
        t = l["terms"][-1]
        ids = l["id"]
        out[ids["bioguide"]] = {
            "name": l["name"].get("official_full") or f'{l["name"]["first"]} {l["name"]["last"]}',
            "party": t.get("party"), "state": t["state"], "chamber": "house" if t["type"] == "rep" else "senate",
            "district": t.get("district"), "first_term_start": l["terms"][0]["start"], "terms": len(l["terms"]),
            "fec_ids": ids.get("fec", []), "lis": ids.get("lis"), "govtrack": ids.get("govtrack"),
        }
    return out


def fetch_legislators() -> dict:
    return parse_legislators(http_get(LEGISLATORS_URL).text)


# ---------------------------------------------------------------- ZIP -> district
ZCCD_URL = "https://raw.githubusercontent.com/OpenSourceActivismTech/us-zipcodes-congress/master/zccd.csv"


def parse_zccd(csv_text: str) -> dict:
    out = defaultdict(list)
    for r in csv.DictReader(io.StringIO(csv_text)):
        out[r["zcta"]].append([r["state_abbr"], int(r["cd"])])
    return dict(out)


def fetch_zip_districts() -> dict:
    return parse_zccd(http_get(ZCCD_URL).text)


# ---------------------------------------------------------------- CEL effectiveness
# The endpoint below is the one CEL's own public score viewer calls. Before production use,
# ask CEL for permission or use their official data downloads (thelawmakers.org/data-download).
CEL_TABLE_URL = "https://thelawmakers.org:3000/vis/table"


def parse_cel_table(payload: dict) -> dict:
    out = {}
    congress = payload.get("congress")
    for row in payload.get("data", []):
        les, bench = row["les"], row.get("benchmark")
        out[row["bioguide"]] = datapoint(
            {"congress": congress, "les": les, "benchmark": bench,
             "expectation": T.cel_expectation(les, bench),
             "norm": T.effectiveness_norm(les, bench) if bench else None,
             "party_rank": row.get("partyRank"), "party_total": row.get("partyTotal")},
            source_url="https://thelawmakers.org/find-representatives", publisher="Center for Effective Lawmaking", verified=True)
    return out


def fetch_cel(congress: int) -> dict:
    return parse_cel_table(get_json(CEL_TABLE_URL, {"congress": congress}))


# ---------------------------------------------------------------- FEC campaign money
FEC_TOTALS_URL = "https://api.open.fec.gov/v1/candidate/{cid}/totals/"


def parse_fec_totals(cid: str, payload: dict, cycle: int, meta: dict | None = None) -> dict | None:
    rows = [r for r in (payload or {}).get("results", []) if r.get("cycle") == cycle]
    if not rows:
        return None
    value = T.money_mix(rows[0])
    if meta:
        value.update({k: meta.get(k) for k in ("name", "party", "office", "state", "district")})
    return datapoint(value, source_url=f"https://www.fec.gov/data/candidate/{cid}/?cycle={cycle}",
                     publisher="Federal Election Commission", verified=True)


FEC_CANDIDATES_URL = "https://api.open.fec.gov/v1/candidates/"


def parse_fec_candidates(payload: dict) -> dict:
    out = {}
    for r in (payload or {}).get("results", []):
        out[r["candidate_id"]] = {"name": r.get("name"), "party": r.get("party_full") or r.get("party"),
                                  "office": r.get("office"), "state": r.get("state"), "district": r.get("district"),
                                  "status": r.get("candidate_status"), "has_raised_funds": r.get("has_raised_funds")}
    return out


def fetch_fec_state_candidates(state: str, cycle: int) -> dict:
    """Every House and Senate candidate the FEC lists for a state and election year."""
    out = {}
    for office in ("H", "S"):
        payload = get_json(FEC_CANDIDATES_URL, {"api_key": API_DATA_GOV_KEY, "state": state, "office": office,
                                                "election_year": cycle, "per_page": 100, "is_active_candidate": "true"})
        out.update(parse_fec_candidates(payload))
    return out


def fetch_fec(candidate_ids: list[str], cycle: int, meta: dict | None = None) -> dict:
    out = {}
    meta = meta or {}
    for cid in candidate_ids:
        payload = get_json(FEC_TOTALS_URL.format(cid=cid), {"api_key": API_DATA_GOV_KEY, "cycle": cycle, "per_page": 5})
        dp = parse_fec_totals(cid, payload, cycle, meta.get(cid))
        if dp:
            out[cid] = dp
    return out


# ---------------------------------------------------------------- House roll calls (attendance)
CLERK_URL = "https://clerk.house.gov/evs/{year}/roll{num:03d}.xml"
CAST = {"yea", "nay", "aye", "no", "present"}


def parse_house_roll(xml_text: str) -> dict:
    """Returns {bioguide: 'cast' | 'missed'} for one roll call."""
    root = ET.fromstring(xml_text)
    out = {}
    for rv in root.iter("recorded-vote"):
        leg, vote = rv.find("legislator"), (rv.findtext("vote") or "").strip().lower()
        if leg is None or not leg.get("name-id"):
            continue
        out[leg.get("name-id")] = "cast" if vote in CAST else "missed" if vote == "not voting" else "other"
    return out


def tally(rolls: list[dict]) -> dict:
    t = defaultdict(lambda: {"cast": 0, "missed": 0, "total": 0})
    for roll in rolls:
        for bid, v in roll.items():
            if v in ("cast", "missed"):
                t[bid][v] += 1
                t[bid]["total"] += 1
    return dict(t)


def add_roll(tally_for_year: dict, roll: dict) -> None:
    for bid, v in roll.items():
        if v in ("cast", "missed"):
            c = tally_for_year.setdefault(bid, {"cast": 0, "missed": 0, "total": 0})
            c[v] += 1
            c["total"] += 1


VOTE_PROGRESS: dict = {}   # filled in for the run manifest


def fetch_house_attendance(years: list[int], max_rolls: int = 2000, budget_min: float = 20.0) -> dict:
    """Incremental: keeps a per-year running tally and the last roll call counted, so each
    nightly run only downloads new roll calls. Stops at the end of each year's votes, after
    3 failed downloads in a row, or when the time budget runs out (it resumes next run)."""
    import time as _t
    from .common import read_json, write_json, FetchError
    cache = read_json("house_votes_tally.json", {}) or {}
    t0, fetched, stopped = _t.monotonic(), 0, "complete"
    for y in years:
        yc = cache.setdefault(str(y), {"last": 0, "tally": {}})
        fails = 0
        for n in range(yc["last"] + 1, max_rolls):
            if (_t.monotonic() - t0) / 60 > budget_min:
                stopped = "time budget reached; resumes next run"
                break
            try:
                r = http_get(CLERK_URL.format(year=y, num=n), tries=2, timeout=15)
            except FetchError:
                fails += 1
                if fails >= 3:
                    stopped = f"3 failed downloads in a row at {y} roll {n}"
                    break
                continue
            if r.status_code == 404 or "<rollcall-vote" not in r.text[:2000]:
                break          # past the last roll call of the year
            fails = 0
            add_roll(yc["tally"], parse_house_roll(r.text))
            yc["last"] = n
            fetched += 1
            if fetched % 50 == 0:
                write_json("house_votes_tally.json", cache)
        write_json("house_votes_tally.json", cache)
        if stopped != "complete":
            break
    VOTE_PROGRESS.update({"fetched_this_run": fetched, "last_roll": {y: cache.get(str(y), {}).get("last", 0) for y in years},
                          "stopped": stopped, "minutes": round((_t.monotonic() - t0) / 60, 1)})
    if fetched == 0 and not any(cache.get(str(y), {}).get("tally") for y in years):
        raise FetchError("No House roll calls could be downloaded: " + stopped)
    combined: dict = {}
    for y in years:
        for bid, c in cache.get(str(y), {}).get("tally", {}).items():
            t = combined.setdefault(bid, {"cast": 0, "missed": 0, "total": 0})
            for k in t:
                t[k] += c[k]
    out = {}
    for bid, c in combined.items():
        out[bid] = datapoint({**c, "norm": T.attendance_norm(c["missed"], c["total"]), "years": years},
                             source_url="https://clerk.house.gov/Votes", publisher="Office of the Clerk, U.S. House", verified=True,
                             note="Absences with a stated family or medical reason are labeled by reviewers from personal explanations in the Congressional Record.")
    return out


# ---------------------------------------------------------------- Senate roll calls
SENATE_URL = "https://www.senate.gov/legislative/LIS/roll_call_votes/vote{c}{s}/vote_{c}_{s}_{n:05d}.xml"


def parse_senate_roll(xml_text: str, lis_to_bioguide: dict) -> dict:
    root = ET.fromstring(xml_text)
    out = {}
    for m in root.iter("member"):
        bid = lis_to_bioguide.get((m.findtext("lis_member_id") or "").strip())
        if not bid:
            continue
        v = (m.findtext("vote_cast") or "").strip().lower()
        out[bid] = "cast" if v in CAST or v in {"guilty", "not guilty"} else "missed" if v == "not voting" else "other"
    return out


VOTEVIEW_VOTES = "https://voteview.com/static/data/out/votes/S{congress}_votes.csv"
VOTEVIEW_MEMBERS = "https://voteview.com/static/data/out/members/S{congress}_members.csv"
# Voteview cast codes: 1 yea, 6 nay, 7/8 present = voted. 2-5 paired or announced, 9 not voting = absent. 0 = not a member.
VV_CAST, VV_MISSED = {"1", "6", "7", "8"}, {"2", "3", "4", "5", "9"}


def parse_voteview(votes_csv: str, members_csv: str) -> dict:
    icpsr_to_bio = {}
    for r in csv.DictReader(io.StringIO(members_csv)):
        if r.get("bioguide_id") and r.get("chamber") == "Senate":
            icpsr_to_bio[r["icpsr"]] = r["bioguide_id"]
    t: dict = {}
    for r in csv.DictReader(io.StringIO(votes_csv)):
        bid = icpsr_to_bio.get(r["icpsr"])
        code = str(r.get("cast_code", "")).split(".")[0]
        if not bid or code not in VV_CAST | VV_MISSED:
            continue
        c = t.setdefault(bid, {"cast": 0, "missed": 0, "total": 0})
        c["cast" if code in VV_CAST else "missed"] += 1
        c["total"] += 1
    return t


def fetch_senate_attendance(congress: int, *_args, **_kw) -> dict:
    """Senate roll calls from Voteview (UCLA), which republishes every recorded Senate vote with
    official member IDs. senate.gov refuses automated downloads."""
    t = parse_voteview(http_get(VOTEVIEW_VOTES.format(congress=congress)).text,
                       http_get(VOTEVIEW_MEMBERS.format(congress=congress)).text)
    SENATE_PROGRESS.update({"members": len(t), "source": "voteview"})
    if not t:
        raise RuntimeError("Voteview returned no Senate votes")
    return {bid: datapoint({**c, "norm": T.attendance_norm(c["missed"], c["total"]), "congress": congress},
                           source_url=f"https://voteview.com/congress/senate/{congress}", publisher="Voteview (UCLA), from U.S. Senate roll calls",
                           verified=True, note="Paired and announced positions count as absences; they aren't recorded votes.")
            for bid, c in t.items()}


SENATE_PROGRESS: dict = {}


# ---------------------------------------------------------------- State legislative effectiveness (CEL)
CEL_STATE_URL = "https://thelawmakers.org:3000/vis/stateTable"


def parse_cel_state(payload: dict) -> dict:
    out = {}
    term = (payload or {}).get("term", {})
    for row in (payload or {}).get("data", []):
        sles, bench = row["sles"], row.get("benchmark")
        out[str(row["slesId"])] = datapoint(
            {"name": row["name"], "party": row.get("party"), "chamber": row.get("chamber"), "district": row.get("district"),
             "state": row.get("state"), "term": f'{term.get("startYear")}-{term.get("endYear")}', "sles": sles, "benchmark": bench,
             "expectation": T.cel_expectation(sles, bench), "norm": T.effectiveness_norm(sles, bench) if bench else None,
             "party_rank": row.get("partyRank"), "party_total": row.get("partyTotal"), "majority": row.get("isMajority")},
            source_url="https://thelawmakers.org/state-highlights", publisher="Center for Effective Lawmaking", verified=True)
    return out


def fetch_cel_state(state: str, start: int, end: int) -> dict:
    return parse_cel_state(get_json(CEL_STATE_URL, {"state": state, "termStartYear": start, "termEndYear": end}))


# ---------------------------------------------------------------- Congress.gov (bipartisanship)
CONGRESS_API = "https://api.congress.gov/v3"
SUBSTANTIVE_TYPES = {"HR", "S", "HJRES", "SJRES"}  # simple and concurrent resolutions are mostly ceremonial; excluded


def fetch_bipartisanship(bioguide: str, sponsor_party: str, congress: int) -> dict | None:
    key = {"api_key": API_DATA_GOV_KEY, "format": "json", "limit": 250}
    data = get_json(f"{CONGRESS_API}/member/{bioguide}/sponsored-legislation", key) or {}
    bills = [b for b in data.get("sponsoredLegislation", [])
             if b.get("congress") == congress and (b.get("type") or "").upper() in SUBSTANTIVE_TYPES]
    parties = []
    for b in bills:
        c = get_json(f'{CONGRESS_API}/bill/{congress}/{b["type"].lower()}/{b["number"]}/cosponsors', key) or {}
        parties.append([x.get("party") for x in c.get("cosponsors", [])])
    share, n = T.bipartisan_share(sponsor_party[:1], [[p[:1] for p in ps if p] for ps in parties])
    if share is None:
        return None
    return datapoint({"share": share, "bills": n, "congress": congress},
                     source_url=f"https://www.congress.gov/member/{bioguide}", publisher="Congress.gov", verified=True)


# ---------------------------------------------------------------- Fact-checks (ClaimReview)
FACTCHECK_URL = "https://factchecktools.googleapis.com/v1alpha1/claims:search"


def claimant_matches(person: str, claimant: str) -> bool:
    """Last name plus at least one first or middle name, so "Sarah Huckabee Sanders" never
    matches "Bernie Sanders" and "Chris Jones" needs both names."""
    toks = [t for t in person.lower().replace(".", "").split() if len(t) > 1]
    c = (claimant or "").lower()
    return bool(toks) and toks[-1] in c and any(t in c for t in toks[:-1])


def parse_claimreviews(payload: dict, claimant: str) -> list[dict]:
    out = []
    for c in (payload or {}).get("claims", []):
        if not claimant_matches(claimant, c.get("claimant")):
            continue
        for r in c.get("claimReview", []):
            out.append({"publisher": (r.get("publisher") or {}).get("name"), "rating": r.get("textualRating", ""),
                        "date": r.get("reviewDate"), "url": r.get("url"), "claim": c.get("text")})
    return out


def fetch_factchecks(name: str) -> dict | None:
    if not GOOGLE_FACTCHECK_KEY:
        return None
    payload = get_json(FACTCHECK_URL, {"query": name, "key": GOOGLE_FACTCHECK_KEY, "pageSize": 200, "languageCode": "en"})
    reviews = parse_claimreviews(payload, name)
    score, n, unmapped = T.factcheck_norm([r["rating"] for r in reviews])
    return datapoint({"norm": score, "n": n, "unmapped": unmapped, "reviews": reviews},
                     source_url="https://toolbox.google.com/factcheck/explorer", publisher="ClaimReview (multiple fact-checkers)",
                     note="Fact-checkers choose which claims to check; shown with that caveat. Hidden below 5 rated claims.")
