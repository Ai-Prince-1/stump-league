"""Generate ar.js: every contested race on Arkansas's Nov 3, 2026 ballot, the unopposed list, the
ballot issues, and dated fact-check lists. Stats come from the pipeline's data files (official
sources). Run by the nightly job after each data refresh:  python3 gen_ar.py ..  (repo root)."""
import json, re, sys
from datetime import date
from pathlib import Path

REPO = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent)
def J(f):
    p = REPO / "data" / f"{f}.json"
    return json.loads(p.read_text()) if p.exists() else {}
CEL, CELS, ATT, SATT, FEC, FC, MEM, LUG, MAN = (J(x) for x in ("cel", "cel_state", "attendance", "senate_attendance", "fec", "factchecks", "members", "lugar", "manifest"))

SRC = {
  "wiki_arhouse": ["Wikipedia (from Arkansas Secretary of State filings)", "2026 Arkansas House of Representatives election", "retrieved Oct 23, 2026", "https://en.wikipedia.org/wiki/2026_Arkansas_House_of_Representatives_election"],
  "wiki_arsen": ["Wikipedia (from Arkansas Secretary of State filings)", "2026 Arkansas Senate election", "retrieved Oct 23, 2026", "https://en.wikipedia.org/wiki/2026_Arkansas_Senate_election"],
  "tb_list": ["Talk Business & Politics", "Election 2026 candidate list", "updated Aug 2026", "https://talkbusiness.net/?p=286245"],
  "greenpapers_ar": ["The Green Papers", "Arkansas 2026 general election candidates", "retrieved Oct 23, 2026", "https://www.thegreenpapers.com/G26/AR"],
  "politics1_ar2": ["Politics1", "Arkansas candidate guide (candidate descriptions)", "retrieved Oct 23, 2026", "https://politics1.com/ar.htm"],
  "artv_debates": ["Arkansas Advocate", "Arkansas TV announces lineup of state, federal debates (invitations accepted)", "Sep 25, 2026", "https://www.newsfromthestates.com/article/arkansas-tv-announces-lineup-state-federal-debates-next-month"],
  "senate_debate_off": ["Arkansas Advocate", "Debate in Arkansas U.S. Senate race won't take place", "Oct 14, 2026", "https://www.newsfromthestates.com/article/debate-arkansas-us-senate-race-wont-take-place-cotton-and-shoffner-campaigns-say"],
  "hd8_special": ["Arkansas Advocate", "2 candidates file for Arkansas House vacancy", "Aug 28, 2026", "https://www.newsfromthestates.com/article/2-candidates-file-arkansas-house-vacancy-created-lawmakers-resignation"],
  "uaex_guide": ["University of Arkansas Cooperative Extension Service", "2026 Arkansas Ballot Issues Voter Guide", "Oct 2026", "https://www.uaex.uada.edu/business-communities/voter-education/docs/2026-Arkansas-Ballot-Issues-Voter-Guide.pdf"],
  "cel_state_src": ["Center for Effective Lawmaking", "State Legislative Effectiveness Scores, Arkansas 2023–24", "nightly", "https://thelawmakers.org/state-highlights"],
  "cel_fed_src": ["Center for Effective Lawmaking", "Legislative Effectiveness Scores, 118th Congress", "nightly", "https://thelawmakers.org/find-representatives"],
  "clerk_src": ["Office of the Clerk, U.S. House", "Roll-call votes, 2025–2026", "nightly", "https://clerk.house.gov/Votes"],
  "voteview_src": ["Voteview (UCLA), from U.S. Senate roll calls", "Senate roll-call votes, 119th Congress", "nightly", "https://voteview.com/congress/senate/119"],
  "lugar_house": ["The Lugar Center and Georgetown McCourt School", "Bipartisan Index, House, 2023", "retrieved Oct 24, 2026", "https://www.thelugarcenter.org/ourwork-86.html"],
  "lugar_senate": ["The Lugar Center and Georgetown McCourt School", "Bipartisan Index, Senate, 2023", "retrieved Oct 24, 2026", "https://www.thelugarcenter.org/ourwork-85.html"],
  "claimreview_src": ["Google Fact Check Tools (ClaimReview)", "Fact-check rulings from PolitiFact, The Washington Post, FactCheck.org and others", "nightly", "https://toolbox.google.com/factcheck/explorer"],
}
def fec_src(cid):
    key = "fec_" + cid
    SRC[key] = ["Federal Election Commission", f"{cid} 2025–2026 financial summary", "nightly", f"https://www.fec.gov/data/candidate/{cid}/?cycle=2026"]
    return key

# ---------------------------------------------------------------- helpers
def slug(s): return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
def initials(n):
    parts = [p for p in re.split(r"[\s.]+", n) if p and p[0].isalpha() and p.lower() not in ("jr", "iii", "ii")]
    return (parts[0][0] + parts[-1][0]).upper()
PARTY = {"R": "Republican", "D": "Democratic", "L": "Libertarian", "I": "Independent"}
pct = lambda x, d=0: f"{100*x:.{d}f}%"
def money(x): return f"${x/1e6:.2f}M" if x >= 1e6 else f"${x/1e3:.1f}K"
def ordinal(n):
    n = int(n)
    return f"{n}th" if 10 <= n % 100 <= 20 else f"{n}{ {1:'st',2:'nd',3:'rd'}.get(n%10,'th') }"
def fmt_date(iso):
    try: d = date.fromisoformat(str(iso)[:10]); return d.strftime("%b %-d, %Y")
    except Exception: return str(iso or "")

def percentile(value, peers, higher_is_better=True):
    """Share of peers this value beats, ties counted half. 1.0 = best in peer group."""
    others = list(peers)
    if len(others) < 2: return None
    better = sum(1 for p in others if (value > p if higher_is_better else value < p))
    ties = sum(1 for p in others if p == value) - 1
    return round((better + 0.5 * max(ties, 0)) / (len(others) - 1), 3)

NA = lambda note: {"status": "na", "note": note}
PEND = lambda note: {"status": "pending", "note": note}
EXEC_NA = "Executive office. Legislative stats don't apply; an executive record (budgets, vetoes, appointments) isn't collected yet."

# ---------------------------------------------------------------- KPI builders
def chamber_of(b):
    v = CEL.get(b, {}).get("value", {})
    return v.get("chamber") or MEM.get(b, {}).get("chamber")

def k_results_fed(b):
    v = CEL.get(b, {}).get("value")
    if not v: return PEND("Not imported yet.")
    ch = chamber_of(b)
    peers = [d["value"]["les"] / d["value"]["benchmark"] for k, d in CEL.items() if d["value"].get("benchmark") and chamber_of(k) == ch]
    p = percentile(v["les"] / v["benchmark"], peers)
    word = {"MEETS": "meets", "EXCEEDS": "exceeds", "BELOW": "below"}[v["expectation"]]
    return {"status": "official", "norm": p, "pct": p, "peer": f"{len(peers)} {'House members' if ch == 'house' else 'senators'}, {v['congress']}th Congress",
            "display": f'{v["les"]:.2f} LES · {word} benchmark of {v["benchmark"]:.2f}',
            "sub": f'{ordinal(v["party_rank"])} of {v["party_total"]} in the same party', "src": "cel_fed_src"}

def k_attendance(b, senate=False):
    src_data, src = (SATT, "voteview_src") if senate else (ATT, "clerk_src")
    v = src_data.get(b, {}).get("value")
    if not v: return PEND("Not imported yet.")
    shares = [d["value"]["missed"] / d["value"]["total"] for d in src_data.values() if d["value"]["total"] >= 100]
    miss = v["missed"] / v["total"]
    p = percentile(miss, shares, higher_is_better=False)
    return {"status": "official", "norm": p, "pct": p, "peer": f"{len(shares)} {'senators' if senate else 'House members'} with recorded votes, 119th Congress",
            "display": f'{v["missed"]} of {v["total"]} roll calls missed ({pct(miss, 1)})', "src": src,
            **({"note": "Paired and announced positions count as absences."} if senate else {})}

def k_bipartisan_fed(b):
    m = LUG.get("members", {}).get(b)
    if not m: return PEND("Bipartisan Index not available for this member.")
    n = LUG["house_total"] if m["chamber"] == "house" else LUG["senate_total"]
    p = round(1 - (m["rank"] - 1) / (n - 1), 3)
    return {"status": "official", "norm": p, "pct": p, "peer": f"{n} {'House members' if m['chamber'] == 'house' else 'senators'} ranked, 2023",
            "display": f'Bipartisan Index {m["score"]:+.2f} · ranked {m["rank"]} of {n}',
            "sub": "0 = the historical average for members in the same party position", "src": "lugar_house" if m["chamber"] == "house" else "lugar_senate"}

def k_funding(cid):
    d = FEC.get(cid, {}).get("value")
    if not d or not d.get("receipts"): return PEND("No FEC financial summary for 2025–2026.")
    parts = [d["small_donor_share"], 1 - d["pac_share"]] + ([d["in_state_share"]] if d.get("in_state_share") is not None else [])
    ins = f' · {pct(d["in_state_share"])} of itemized individual money from in-state' if d.get("in_state_share") is not None else ""
    return {"status": "official", "norm": round(sum(parts) / len(parts), 3),
            "display": f'{pct(d["pac_share"])} from PACs and party committees · {pct(d["small_donor_share"])} from donors giving $200 or less{ins}',
            "sub": f'Raised {money(d["receipts"])} through {fmt_date(d.get("coverage_end_date"))}' + ("" if d.get("in_state_share") is not None else " · in-state share arrives with the next nightly run"),
            "src": fec_src(cid)}

def find_sles(last, chamber, district):
    hits = [(k, d["value"]) for k, d in CELS.items()
            if d["value"]["name"].split(",")[0].strip().lower() == last.lower() and d["value"]["chamber"] == chamber and str(d["value"]["district"]) == str(district)]
    return hits[0] if len(hits) == 1 else (None, None)

def k_results_state(last, chamber, district, note=None):
    k, v = find_sles(last, chamber, district)
    if not v: return None, None
    peers = [d["value"]["sles"] / d["value"]["benchmark"] for d in CELS.values() if d["value"]["chamber"] == chamber and d["value"].get("benchmark")]
    p = percentile(v["sles"] / v["benchmark"], peers)
    ch = "Arkansas House" if chamber == "lower" else "Arkansas Senate"
    word = {"MEETS": "meets", "EXCEEDS": "exceeds", "BELOW": "below"}[v["expectation"]]
    st = {"status": "official", "norm": p, "pct": p, "peer": f"{len(peers)} {ch} members, 2023–24",
          "display": f'{v["sles"]:.2f} SLES · {word} benchmark of {v["benchmark"]:.2f}',
          "sub": f'{ordinal(v["party_rank"])} of {v["party_total"]} {"majority" if v["majority"] else "minority"}-party members', "src": "cel_state_src"}
    if note: st["note"] = note
    return st, k

# Debates: Arkansas TV invited every qualifying candidate (nonpartisan host) -> counts toward Answers.
DEBATE_YES = {"shoffner", "wadlin", "crawford", "ygreen", "parsons", "hill", "cjones", "womack", "ryerse", "wilson",
              "westerman", "rrussell", "sanders", "flove", "shelby", "hammer", "grappe", "pakko"}
DEBATE_NO = {"cotton": "Declined the Arkansas TV debate with Shoffner and Wadlin, and an Oct 22 ASU-TV debate. Had accepted a Salem Media debate that didn't invite the Libertarian and was later withdrawn by the host."}
def k_answers(cid):
    if cid in DEBATE_NO:
        deb = {"label": "Qualifying debates", "state": "no", "value": DEBATE_NO[cid], "src": "senate_debate_off"}
    elif cid in DEBATE_YES:
        deb = {"label": "Qualifying debates", "state": "yes", "value": "Accepted the Arkansas TV debate invitation (October 2026)", "src": "artv_debates"}
    else:
        deb = {"label": "Qualifying debates", "state": "pending", "value": "No debate offered to every qualifying candidate found yet"}
    parts = [deb,
             {"label": "Questionnaires", "state": "pending", "value": "Not collected yet (Vote411, Ballotpedia, newsroom guides)"},
             {"label": "Town halls", "state": "pending", "value": "Not collected yet"},
             {"label": "Disclosures", "state": "pending", "value": "Not collected yet"}]
    got = [p for p in parts if p["state"] in ("yes", "no")]
    if not got:
        return {"status": "pending", "note": "No parts collected yet.", "parts": parts}
    yes = sum(1 for p in got if p["state"] == "yes")
    return {"status": "official", "norm": yes / len(got), "parts": parts,
            "display": ("Accepted" if yes else "Declined") + " the only qualifying debate invitation tracked",
            "sub": "1 of 4 parts collected: debates. Questionnaires, town halls and disclosures aren't collected yet."}

GOOD = {"true", "mostly true", "correct", "accurate", "mostly correct", "mostly accurate", "geppetto checkmark", "one pinocchio"}

RACES, CANDS = [], {}
def add(cid, **c):
    c.setdefault("initials", initials(c["name"]))
    CANDS[cid] = c
    return cid

CONG = {
  "house": {"can": ["Write, sponsor and vote on federal bills", "Request Community Project Funding (earmarks) for local projects", "Oversee federal agencies through committee work"],
            "cant": ["Pass a bill alone; it needs a majority of the House members voting, then the Senate and the president's signature", "Set state or local taxes"]},
  "senate": {"can": ["Vote on federal laws", "Confirm federal judges and cabinet officials", "Approve treaties"],
             "cant": ["Start tax bills; those must begin in the House", "Pass most bills without 60 votes to end debate"]},
}
STATE_OFFICES = {
  "governor": {"can": ["Sign or veto bills from the General Assembly", "Propose the state budget", "Appoint leaders of state agencies, boards and commissions", "Call the legislature into special session"],
               "cant": ["Pass laws or set tax rates without the legislature"]},
  "ltgov": {"can": ["Preside over the Arkansas Senate", "Become governor if the office becomes vacant", "Act as governor when the governor is out of state"],
            "cant": ["Sign or veto bills while the governor is in the state"]},
  "sos": {"can": ["Oversee statewide election administration and certify results", "Register businesses and keep official state records", "Manage the State Capitol building and grounds"],
          "cant": ["Run local polling places; county election commissions do that", "Change election law; the legislature does that"]},
  "lands": {"can": ["Sell tax-delinquent land and return the proceeds to local governments", "Manage state-owned lands and mineral leases"],
            "cant": ["Set property tax rates or collect property taxes"]},
  "state-house": {"can": ["Write, sponsor and vote on state laws", "Vote on the state budget", "Refer constitutional amendments to voters"],
                  "cant": ["Pass a law alone; bills need the Senate and the governor's signature or a veto override"]},
  "state-senate": {"can": ["Write, sponsor and vote on state laws", "Vote on the state budget", "Confirm many of the governor's appointments"],
                   "cant": ["Pass a law alone; bills need the House and the governor's signature or a veto override"]},
}
def race(rid, short, name, office, level, blurb, cands, context=()):
    o = CONG.get(office) or STATE_OFFICES[office]
    RACES.append(dict(id=rid, short=short, name=name, state="Arkansas", office=office, level=level, election="Nov 3, 2026", sample=False,
                      blurb=blurb, candidates=cands, context=list(context), can=o["can"], cant=o["cant"]))

def fed_officeholder(cid, name, party, role, b, fecid, senate, extra_facts=(), plans=(), funds=None, positions=None, attendance=None):
    k = {"answers": k_answers(cid), "funding": k_funding(fecid),
         "attendance": attendance or k_attendance(b, senate), "effectiveness": k_results_fed(b), "bipartisan": k_bipartisan_fed(b)}
    c = dict(name=name, party=party, role=role, track="officeholder", ids={"bioguide": b, "fec": fecid, "factcheck": name}, kpi=k,
             facts=[{"label": "Office", "text": role + ".", "src": "greenpapers_ar"}] + list(extra_facts), plans=list(plans), positions=positions or {})
    if funds: c["funds"] = funds
    return add(cid, **c)

def challenger(cid, name, party, role, desc=None, fecid=None, prior=None, facts=(), plans=(), positions=None, desc_src="politics1_ar2"):
    k = {"answers": k_answers(cid), "funding": k_funding(fecid) if fecid else PEND("No campaign-finance filing connected for this race."),
         "attendance": NA("Applies to officeholders"), "effectiveness": NA("Applies to legislators"), "bipartisan": NA("Applies to legislators")}
    ids = {"factcheck": name}
    if fecid: ids["fec"] = fecid
    if prior and prior[0]:
        k["effectiveness"] = prior[0]; ids["sles"] = prior[1]
    f = ([{"label": "Background", "text": desc + ".", "src": desc_src}] if desc else []) + list(facts)
    return add(cid, name=name, party=party, role=role, track="candidate", ids=ids, kpi=k, facts=f, plans=list(plans), positions=positions or {})

# ---------------------------------------------------------------- Congress
race("ar-sen", "AR-SEN", "U.S. Senate · Arkansas", "senate", "congress",
     "A two-term incumbent faces a farmer and a business consultant. The challengers debated on public TV; the incumbent declined.",
     [fed_officeholder("cotton", "Tom Cotton", "Republican", "U.S. senator since 2015", "C001095", "S4AR00103", True),
      challenger("shoffner", "Hallie Shoffner", "Democratic", "Challenger", "Farmer", "S6AR00199"),
      challenger("wadlin", "Jeff Wadlin", "Libertarian", "Challenger", "Business consultant and 2018 justice of the peace candidate", "S6AR00223")],
     [{"text": "Arkansas TV invited all three nominees to an Oct 12 debate; Shoffner and Wadlin accepted, Cotton declined.", "src": "artv_debates"},
      {"text": "A separate Cotton–Shoffner debate offered by Salem Media was withdrawn by the host. Cotton also declined an Oct 22 ASU-TV debate.", "src": "senate_debate_off"}])
race("ar1", "AR-1", "U.S. House · Arkansas 1st District", "house", "congress", "Eastern Arkansas. An eight-term incumbent faces a retired pathologist and a Libertarian.",
     [fed_officeholder("crawford", "Rick Crawford", "Republican", "U.S. representative since 2011", "C001087", "H0AR01083", False),
      challenger("ygreen", "Terri Yarbrough Green", "Democratic", "Challenger", "Retired pathologist", "H6AR01155"),
      challenger("parsons", "Steve Parsons", "Libertarian", "Challenger", "Retired consultant; 2024 nominee for this seat and 2022 state representative nominee")],
     [{"text": "All three nominees accepted Arkansas TV's debate invitation.", "src": "artv_debates"}])
race("ar2", "AR-2", "U.S. House · Arkansas 2nd District", "house", "congress", "Central Arkansas, including Little Rock. A six-term incumbent faces the 2022 Democratic nominee for governor.",
     [fed_officeholder("hill", "French Hill", "Republican", "U.S. representative since 2015", "H001072", "H4AR02141", False),
      challenger("cjones", "Chris Jones", "Democratic", "Challenger", "Nuclear engineer, pastor and nonprofit executive; 2022 Democratic nominee for governor", "H6AR02286")],
     [{"text": "Both nominees accepted Arkansas TV's debate invitation.", "src": "artv_debates"}])

# AR-3 (moved here from the hand-written pilot so every Arkansas race comes from one generator)
WOMACK_ATT = k_attendance("W000809")
if WOMACK_ATT.get("status") == "official":
    WOMACK_ATT.update({"status": "draft", "src2": "cr_firstmiss",
                       "note": "Includes weeks he was home caring for his wife during her final illness. Held as draft until reviewers label absences with a stated family or medical reason; before Nov 2025 he hadn't missed a vote since 2011 (8,823 straight)."})
race("ar3", "AR-3", "U.S. House · Arkansas 3rd District", "house", "congress",
     "Northwest Arkansas and the Fort Smith area. A 15-year incumbent faces two challengers who have run before.",
     [fed_officeholder("womack", "Steve Womack", "Republican", "U.S. representative since 2011", "W000809", "H0AR03055", False,
        extra_facts=[{"label": "Prior office", "text": "Mayor of Rogers for 12 years; retired Arkansas Army National Guard colonel after 30+ years.", "src": "tbp_2017", "src2": "tbp_2024p"},
                     {"label": "Committee role", "text": "Chairs the House Appropriations subcommittee on Transportation, Housing and Urban Development (THUD).", "src": "cr_cpf27"},
                     {"label": "Last result", "text": "Won the 2024 general election with 63.8%.", "src": "nbc_2024"}],
        plans=[{"text": "Make Northwest Arkansas and River Valley roads a top priority in Congress.", "src": "ardot_105", "checks": {"m": 0, "t": 0, "c": 0, "p": 1},
                "notes": [{"text": "Related record: $59M for the Springdale Northern Bypass, requested by Womack, enacted in FY2026.", "src": "ardot_105"}]},
               {"text": "Congress should deliver full-year government funding.", "src": "cr_fy26_pkg", "checks": {"m": 1, "t": 0, "c": 0, "p": 1},
                "notes": [{"text": "Related record: full-year FY2026 funding passed in Feb 2026, after a shutdown and stopgap measures.", "src": "cr_reopen"}]}],
        funds={"items": [{"label": "FY2026 earmarks", "value": "$108M+", "sub": "15 projects · all signed into law", "src": "tbp_cpf26", "src2": "cr_cpf26_law"},
                         {"label": "FY2027 earmarks", "value": "$105.4M", "sub": "19 projects · advanced in committee", "src": "cr_cpf27"},
                         {"label": "Largest single item", "value": "$59M", "sub": "Springdale Northern Bypass", "src": "ardot_105"}],
               "context": [{"text": "Earmark totals rise with seniority and committee position; he chairs the subcommittee that writes the transportation bill.", "src": "cr_cpf27"},
                           {"text": "He voted against the 2021 infrastructure law (IIJA), which separately sent $282.5M to Northwest Arkansas National Airport access.", "src": "tbp_iija"}],
               "peer": "Peer comparison (same-committee members, per capita, predecessor) not yet imported."},
        positions={"roads": {"text": "Calls regional roads a top priority; secured bypass funding.", "src": "ardot_105"}, "money": None, "cost": None},
        attendance=WOMACK_ATT),
      challenger("ryerse", "Robb Ryerse", "Democratic", "Challenger", None, "H6AR03128",
        facts=[{"label": "Background", "text": "Pastor and nonprofit leader; has lived in Springdale for 20 years and started the Vintage Fellowship church.", "src": "ryerse_meet"},
               {"label": "Prior campaign", "text": "Challenged Womack in the 2018 Republican primary and lost; now running as a Democrat.", "src": "sentinel_2018", "src2": "politics1_ar"}],
        plans=[{"text": "Refuse corporate PAC money, as he did in 2018.", "src": "ryerse_blog", "checks": {"m": 1, "t": 1, "c": 0, "p": 1},
                "notes": [{"text": "FEC filings show some money from PACs and party committees combined; whether any came from a corporate PAC needs the itemized donor list.", "src": "fec_ryerse"}]},
               {"text": "Lower the cost of living.", "src": "ryerse_blog", "checks": {"m": 0, "t": 0, "c": 0, "p": 1}},
               {"text": "Get big money out of politics.", "src": "ryerse_blog", "checks": {"m": 0, "t": 0, "c": 0, "p": 1}}],
        positions={"roads": None, "money": {"text": "Pledges no corporate PAC money.", "src": "ryerse_blog"}, "cost": {"text": "Lists lowering the cost of living as a campaign issue.", "src": "ryerse_blog"}}),
      challenger("wilson", "Bobby Wilson", "Libertarian", "Challenger", None, "H4AR03081",
        facts=[{"label": "Background", "text": "Business analyst from Bentonville.", "src": "politics1_ar"},
               {"label": "Prior campaign", "text": "Libertarian nominee for this seat in 2024 and again in 2026.", "src": "ada_lp"}])],
     [{"text": "All three nominees accepted Arkansas TV's debate invitation; the debate aired in October 2026.", "src": "pbs_ar3", "src2": "artv_debates"}])
race("ar4", "AR-4", "U.S. House · Arkansas 4th District", "house", "congress", "Southern and western Arkansas. A six-term incumbent faces a medical office manager and National Guard veteran.",
     [fed_officeholder("westerman", "Bruce Westerman", "Republican", "U.S. representative since 2015", "W000821", "H4AR04048", False),
      challenger("rrussell", "Rus Russell", "Democratic", "Challenger", "Medical office manager and National Guard veteran; 2020 candidate for governor", "H6AR04084")],
     [{"text": "Both nominees accepted Arkansas TV's debate invitation.", "src": "artv_debates"}])

# ---------------------------------------------------------------- statewide
def exec_officeholder(cid, name, role):
    k = {"answers": k_answers(cid), "funding": PEND("State campaign-finance filings not connected yet."),
         "attendance": NA(EXEC_NA), "effectiveness": NA("Applies to legislators"), "bipartisan": NA("Applies to legislators")}
    return add(cid, name=name, party="Republican", role=role, track="officeholder", ids={"factcheck": name}, kpi=k,
               facts=[{"label": "Office", "text": role + ".", "src": "greenpapers_ar"}], plans=[], positions={})
def state_challenger(cid, name, party, role, desc, prior=None, facts=()):
    c = challenger(cid, name, party, role, desc, None, prior, facts)
    CANDS[c]["kpi"]["funding"] = PEND("State campaign-finance filings not connected yet.")
    return c

race("ar-gov", "AR-GOV", "Governor · Arkansas", "governor", "statewide", "The incumbent governor faces a state senator and an oil rig operations supervisor.",
     [exec_officeholder("sanders", "Sarah Huckabee Sanders", "Governor since 2023"),
      state_challenger("flove", "Fred Love", "Democratic", "Challenger", "State senator and former state representative", k_results_state("Love", "upper", 15, "As a state senator, 2023–24.")),
      state_challenger("shelby", "Colt Shelby", "Libertarian", "Challenger", "Oil rig operations supervisor and farmer")],
     [{"text": "All three nominees accepted Arkansas TV's Oct 13 debate invitation.", "src": "artv_debates"}])
race("ar-ltgov", "AR-LTGOV", "Lieutenant Governor · Arkansas", "ltgov", "statewide", "The incumbent faces a Libertarian teacher, firefighter and Navy veteran. No Democrat is on the ballot.",
     [exec_officeholder("rutledge", "Leslie Rutledge", "Lieutenant governor since 2023"),
      state_challenger("kalagias", "Mike Kalagias", "Libertarian", "Challenger", "Teacher, firefighter and Navy veteran")])
race("ar-sos", "AR-SOS", "Secretary of State · Arkansas", "sos", "statewide", "An open seat. A state senator, a marketing specialist and an economist are running for the office that oversees elections.",
     [state_challenger("hammer", "Kim Hammer", "Republican", "Open-seat candidate", "State senator, Baptist pastor and radio show host", k_results_state("Hammer", "upper", 16, "As a state senator, 2023–24.")),
      state_challenger("grappe", "Kelly Grappe", "Democratic", "Open-seat candidate", "Marketing specialist and community activist"),
      state_challenger("pakko", "Michael Pakko", "Libertarian", "Open-seat candidate", "Economist; 2024 Libertarian nominee for state treasurer")],
     [{"text": "All three nominees accepted Arkansas TV's Oct 15 debate invitation.", "src": "artv_debates"}])
race("ar-lands", "AR-LANDS", "Commissioner of State Lands · Arkansas", "lands", "statewide", "An open seat. The current secretary of state faces a Libertarian. No Democrat is on the ballot.",
     [state_challenger("jester", "Cole Jester", "Republican", "Open-seat candidate", "Current secretary of state, former aide to the governor and attorney"),
      state_challenger("olson", "Chris Olson", "Libertarian", "Open-seat candidate", "Mental health worker and Libertarian activist")])

# ---------------------------------------------------------------- legislature
HOUSE = """3|Stetson Painter*R;Carrie Huddleston D
9|Diana Gonzales Worthen*D;Matt Goff R
10|Mindy McAlindon*R;Jacob Allen D
11|Rebecca Burkes*R;Rey Hernandez D
13|Scott Richardson*R;Mitchell Smith D
14|Nick Burkes*R;Timothy J. Heron Jr. D
15|John P. Carr*R;Daniel Holtmeyer D
16|Kendon Underwood*R;Letisha Hinds D
19|Steve Unger*R;Jamie Atkinson D
24|Charlene Fite R;Ryan Intchauspe D
25|Chad Puryear*R;Courtney King D
29|Rick McClure*R;Deonna Morgan D
32|Jack Ladyman*R;Erika Askeland D
34|Joey L. Carr*R;Michael Middlebrook D
35|Robert Thorne Jr. R;Audrey P. Willis D
36|Johnny Rye*R;Shamal C. Carter D
48|Ryan Rose*R;Hunter Jackson L
50|Zachary Gramlich*R;Wendy Peer D
51|Cindy Crawford*R;Jane-Ellen Udouj-Kutchka D
53|Matt Duffield*R;Jennifer Lewter D
54|Mary Bentley*R;Doug Corbitt D
55|Matthew Brown*R;Cynthia Nations D
56|Steve Magie*D;Mark Brannan R
58|Les Eaves*R;Jocelyn Fry L
60|Roger Lynch*R;Beverly Coleman-Keown D
61|Jeremiah Moore*R;Garrett Sheeks L
62|Mark McElroy*R;Dexter R. Miller D
67|Karilyn Brown*R;Andrew Cade Eberly D
69|David Ray*R;Dean Hunter D
70|Alex Holladay*D;Bo Renshaw R
71|Stephen Bright R;Cassandra Mayes D
75|Ashley Hudson*D;Hunter Sadler R
76|Joy C. Springer*D;Isbac Ceja R
80|Denise Ennett*D;Daniel Stuckey L
81|R. J. Hawk*R;Gina Thomas-Littlejohn D
100|Carol Dalby*R;Calvin Thomason D"""
SENATE = """9|Jessie McGruder D;Kenny Phillips R
13|Brandon Achor R;Allison Sweatman D
16|Rodney Wright R;Joshua Irby D
27|Justin Boyd*R;Eduardo Guzman D"""
EXTRA_FACTS = {  # backgrounds from a second candidate list
  ("upper", 9, "McGruder"): {"label": "Current office", "text": "State representative.", "src": "tb_list"},
  ("upper", 16, "Wright"): {"label": "Current office", "text": "County sheriff.", "src": "tb_list"},
}
MOVERS = {("lower", 24, "Fite"): ("lower", 24), ("upper", 13, "Achor"): ("lower", 71)}

def parse_line(line):
    d, rest = line.split("|")
    out = []
    for tok in rest.split(";"):
        tok = tok.strip()
        inc = "*" in tok
        m = re.match(r"(.+?)\s?([RDLI])$", tok.replace("*", " ").strip())
        out.append((m.group(1).strip(), m.group(2), inc))
    return int(d), out

def leg_cands(chamber, dist, people, race_id):
    ids = []
    chname = "House" if chamber == "lower" else "Senate"
    open_seat = not any(inc for _, _, inc in people)
    for name, p, inc in people:
        last = name.replace(" Jr.", "").split()[-1]
        cid = f"{race_id}-{slug(last)}"
        role = f"Incumbent, Arkansas {chname} District {dist}" if inc else ("Open-seat candidate" if open_seat else "Challenger")
        k = {"answers": k_answers(cid), "funding": PEND("State campaign-finance filings not connected yet."),
             "attendance": PEND("Arkansas legislature vote records not connected yet.") if inc else NA("Applies to officeholders"),
             "effectiveness": NA("Applies to legislators"),
             "bipartisan": PEND("Arkansas legislature bill records not connected yet.") if inc else NA("Applies to legislators")}
        facts = [{"label": "On the ballot", "text": role + "." if inc else f"{role} for Arkansas {chname} District {dist}.", "src": "wiki_arhouse" if chamber == "lower" else "wiki_arsen"}]
        if (chamber, dist, last) in EXTRA_FACTS: facts.append(EXTRA_FACTS[(chamber, dist, last)])
        c = dict(name=name, party=PARTY[p], role=role, track="officeholder" if inc else "candidate", ids={}, kpi=k, facts=facts, plans=[], positions={})
        mv = MOVERS.get((chamber, dist, last))
        lookup = mv if mv else ((chamber, dist) if inc else None)
        if lookup:
            note = None if (inc and not mv) else f"As a state {'representative' if lookup[0]=='lower' else 'senator'}, 2023–24 (District {lookup[1]})."
            st, key = k_results_state(last, lookup[0], lookup[1], note)
            if st:
                k["effectiveness"] = st; c["ids"]["sles"] = key
                if not inc:
                    facts.append({"label": "Prior office", "text": f"Served in the Arkansas {'House' if lookup[0]=='lower' else 'Senate'} (District {lookup[1]}) in 2023–24.", "src": "cel_state_src"})
            elif inc:
                k["effectiveness"] = PEND("No 2023–24 score; likely first elected in 2024 or later.")
        add(cid, **c)
        ids.append(cid)
    return ids

for line in SENATE.splitlines():
    d, people = parse_line(line)
    rid = f"ar-sd{d}"
    inc = next((n for n, _, i in people if i), None)
    race(rid, f"SD-{d}", f"Arkansas Senate · District {d}", "state-senate", "state-senate",
         (f"Incumbent {inc} faces a challenger." if inc else "An open seat."), leg_cands("upper", d, people, rid),
         [{"text": "Arkansas has 35 state senators; 17 seats are on this year's ballot, and 13 of those are unopposed.", "src": "wiki_arsen"}])
for line in HOUSE.splitlines():
    d, people = parse_line(line)
    rid = f"ar-hd{d}"
    inc = next((n for n, _, i in people if i), None)
    race(rid, f"HD-{d}", f"Arkansas House · District {d}", "state-house", "state-house",
         (f"Incumbent {inc} faces a challenger." if inc else "An open seat."), leg_cands("lower", d, people, rid),
         [{"text": "All 100 Arkansas House seats are on the ballot; 64 are unopposed.", "src": "wiki_arhouse"}])
race("ar-hd8s", "HD-8 SPECIAL", "Arkansas House · District 8 special election", "state-house", "state-house",
     "Fills the rest of the current term, through January 2027, after the incumbent resigned. Brian Armas (R) is unopposed for the full term that follows.",
     [add("ar-hd8s-armas", name="Kara Armas", party="Republican", role="Special-election candidate", track="candidate", ids={},
          kpi={"answers": k_answers("ar-hd8s-armas"), "funding": PEND("State campaign-finance filings not connected yet."), "attendance": NA("Applies to officeholders"), "effectiveness": NA("Applies to legislators"), "bipartisan": NA("Applies to legislators")},
          facts=[{"label": "On the ballot", "text": "Candidate for the District 8 special election; wife of Brian Armas, who is unopposed for the next full term.", "src": "hd8_special"}], plans=[], positions={}),
      add("ar-hd8s-stohlton", name="Parker Stohlton", party="Democratic", role="Special-election candidate", track="candidate", ids={},
          kpi={"answers": k_answers("ar-hd8s-stohlton"), "funding": PEND("State campaign-finance filings not connected yet."), "attendance": NA("Applies to officeholders"), "effectiveness": NA("Applies to legislators"), "bipartisan": NA("Applies to legislators")},
          facts=[{"label": "On the ballot", "text": "Candidate for the District 8 special election, from Bella Vista.", "src": "hd8_special"}], plans=[], positions={})],
     [{"text": "The governor called the special election to coincide with Nov 3.", "src": "hd8_special"}])

# ---------------------------------------------------------------- unopposed
UNOPPOSED = {
  "Statewide": [("Attorney General", "Tim Griffin (R)*"), ("Treasurer", "John Thurston (R)*"), ("Auditor", "Dennis Milligan (R)*")],
  "Arkansas Senate": [(f"District {d}", n) for d, n in [(2,"Matt Stone (R)*"),(7,"Alan Clark (R)*"),(10,"Ron Caldwell (R)*"),(11,"Ricky Hill (R)*"),(14,"Clarke Tucker (D)*"),(15,"Tara Shephard (D)"),(21,"Jeremy Wooldridge (R)"),(24,"Missy Irvin (R)*"),(28,"Bryan King (R)*"),(30,"Denise Garner (D)"),(31,"Clint Penzo (R)*"),(32,"Joshua P. Bryant (R)*"),(35,"Tyler Dees (R)*")]],
  "Arkansas House": [],
}
HOUSE_UNOPP = """1 Mark A. Nichols R;2 Trey Steimel* R;4 Jason Nazarenko* R;5 Mike Bishop R;6 Cody Rogers R;7 Brit McKenzie* R;8 Brian Armas R;12 Hope Hendren Duke* R;17 Randy Torres* R;18 Robin Lundstrum* R;20 Max Deitchler D;21 Nicole Clowney* D;22 David Whitaker* D;23 Kendra Moore* R;26 James Eaton* R;27 Steven Walker* R;28 Bart Schulz* R;30 Josh Longmire R;31 Jimmy Gazaway* R;33 Jon Milligan* R;37 Steve Hollowell* R;38 Dwight Tosh* R;39 Wayne Long* R;40 Shad Pearce* R;41 Alyssa Brown* R;42 Jeremy Riddle R;43 Rick Beck* R;44 Bill Teeter* R;45 Aaron Pilkington* R;46 Tonya Fletcher R;47 Lee Johnson* R;49 Jay Richardson* D;52 Brent Montgomery R;57 Cameron Cooper* R;59 Jim Wooten* R;63 Lincoln Barnett* D;64 Ken Ferguson* D;65 Glenn Barnes* D;66 Mark Perry* D;68 Brian S. Evans* R;72 Talesha Dokes D;73 Andrew Collins* D;74 Tippi McCullough* D;77 Steven Person D;78 Keith Brooks* R;79 Michael Mason D;82 Tony Furman* R;83 Paul Childress* R;84 Les Warren* R;85 Richard McGrew* R;86 John Maddox* R;87 DeAnn Vaught* R;88 Dolly Henley* R;89 Justin Gonzales* R;90 Richard Womack* R;91 Bruce Cozart* R;92 Dawn Creekmore R;93 Mike Holcomb* R;94 John Kyle Day R;95 Howard Beaty* R;96 Sonia Eubanks Barker* R;97 Jim Andrews R;98 Wade Andrews* R;99 Beth Baker R"""
for tok in HOUSE_UNOPP.split(";"):
    m = re.match(r"(\d+) (.+?)(\*?) ([RDL])$", tok.strip())
    UNOPPOSED["Arkansas House"].append((f"District {m.group(1)}", f"{m.group(2)} ({m.group(4)}){m.group(3)}"))

# ---------------------------------------------------------------- ballot issues
ISSUES = [
 {"n": 1, "title": "Citizens Only Voting Amendment", "route": "Referred by the legislature (HJR 1018, 2025)",
  "does": "Adds wording to Article 3 of the Arkansas Constitution saying only U.S. citizens who meet the existing qualifications may vote, and that people who don't meet them may not vote in any state or local election. The four existing qualifications don't change. Takes effect Jan 1, 2027 if approved.",
  "now": "The Constitution already limits voting to U.S. citizens who live in Arkansas, are at least 18 and are registered. The citizenship requirement dates to 1920.",
  "yes": "Change the Constitution to say only U.S. citizens meeting the existing qualifications may vote in Arkansas elections.",
  "no": "Leave Article 3's wording on who can vote as it is.",
  "pro": "Supporters say \"only citizens\" wording sets an exclusive limit rather than a minimum that could later be expanded.",
  "con": "Opponents say it changes nothing in practice and could be used to pass new proof-of-citizenship laws in 2027."},
 {"n": 2, "title": "Right to Keep and Bear Arms Amendment", "route": "Referred by the legislature (SJR 11, 2025)",
  "does": "Expands Article 2, Section 5 to say citizens may keep and bear arms for common defense, lawful hunting and recreation, and any other lawful purpose, including ammunition, accessories and components, and calls the right natural, fundamental and individual. Takes effect Jan 1, 2027 if approved.",
  "now": "Article 2, Section 5 provides a right to keep and bear arms \"for their common defense,\" wording that dates to 1874.",
  "yes": "Change the Constitution to spell out that the right covers ammunition, accessories and components without limitation, and other lawful purposes.",
  "no": "Keep the current Article 2, Section 5 wording.",
  "pro": "Supporters say it clarifies what the right covers and makes its individual nature explicit, reducing room for legal disputes.",
  "con": "Opponents say the \"without limitation\" wording could make firearm safety laws harder to defend, such as limits for people convicted of serious crimes."},
 {"n": 3, "title": "Economic Development Programs and Districts", "route": "Referred by the legislature (SJR 15, 2025)",
  "does": "Lets the legislature create programs, loans and grants of public money for economic development, and authorize economic development districts that could issue bonds, be exempt from other entities' property taxes, and levy their own taxes or fees. It creates no district itself; the legislature would write the rules. Takes effect Jan 1, 2027 if approved.",
  "now": "Tax increment financing districts have been allowed since 2000, with limits set by a 2007 court decision. Arkansas voters haven't voted on economic development districts before.",
  "yes": "Allow these programs, districts, district taxes and fees, and voter-approved local bonds, and override conflicting constitutional provisions and court rulings.",
  "no": "Don't allow these programs and districts.",
  "pro": "Supporters say districts could fund housing, infrastructure and redevelopment and help communities compete with neighboring states without raising taxes.",
  "con": "Opponents say property removed from school, county and city tax rolls would shift costs to others, and the details are left to future legislation."},
 {"n": 4, "title": "$500 Million Water, Waste Disposal and Pollution Abatement Bonds", "route": "Act 578 of 2025, sent to voters by the legislature",
  "does": "Lets the Arkansas Natural Resources Commission issue up to $500 million in state-backed bonds for water, sewer, pollution control, drainage, irrigation, flood control and wetlands projects, repaid over up to 35 years. Irrigation is capped at $165 million, and no more than $60 million can be issued in any two-year period without legislative approval. Takes effect July 1, 2027 if approved.",
  "now": "Most state general obligation bonds need voter approval. Voters approved a similar $300 million water bond in 2008.",
  "yes": "Allow the state to issue the bonds, within the $500 million cap and the $60 million two-year limit.",
  "no": "Don't allow new water, waste disposal and pollution abatement bonds.",
  "pro": "Supporters say the money is essential for water and sewer projects and past bond issues have helped communities.",
  "con": "Opponents say counties already struggle with costs and the broad wording could steer money to select projects while adding interest costs."},
]
RACES.append(dict(id="ar-issues", short="ISSUES", name="Statewide ballot issues · Arkansas", state="Arkansas", office="issues", level="issues",
                  election="Nov 3, 2026", sample=False, blurb="Four questions the legislature sent to voters: three constitutional amendments and one bond question. Explained in neutral terms; nothing here is scored.",
                  candidates=[], can=[], cant=[], context=[{"text": "Summaries follow the University of Arkansas Cooperative Extension Service's nonpartisan voter guide.", "src": "uaex_guide"}], issues=ISSUES))

# ---------------------------------------------------------------- fact-check lists (every tracked name, Arkansas and Ohio)
FACTCHECKS = {}
for name, dp in FC.items():
    rows = []
    for r in dp.get("value", {}).get("reviews", []):
        rows.append({"d": (r.get("date") or "")[:10], "pub": r.get("publisher") or "", "r": r.get("rating") or "", "url": r.get("url") or "", "claim": (r.get("claim") or "")[:180]})
    rows.sort(key=lambda x: x["d"] or "0000", reverse=True)
    FACTCHECKS[name] = rows

# ---------------------------------------------------------------- checks + output
contested = [r for r in RACES if r["level"] != "issues"]
n_cands = sum(len(r["candidates"]) for r in contested)
n_unopp = sum(len(v) for v in UNOPPOSED.values())
assert len(contested) == 50, len(contested)
assert n_cands == len(CANDS) == 105, (n_cands, len(CANDS))
assert n_unopp == 80, n_unopp
assert len(ISSUES) == 4
for c in CANDS.values():
    assert set(c["kpi"]) == {"answers", "funding", "attendance", "effectiveness", "bipartisan"}, c["name"]
blob = json.dumps(RACES) + json.dumps(CANDS)
assert not re.search(r"218 House votes|218 when all seats", blob), "218-vote error is back"
asof = fmt_date((MAN.get("_run") or {}).get("date") or date.today().isoformat())

out = ["/* Arkansas: every contested race on the Nov 3, 2026 ballot. Generated by gen_ar.py from the pipeline's data files. Do not edit by hand. */",
       f"const DATA_AS_OF = {json.dumps(asof)};",
       "Object.assign(SOURCES, " + json.dumps({k: {"pub": v[0], "title": v[1], "date": v[2], "url": v[3]} for k, v in SRC.items()}, ensure_ascii=False) + ");",
       "Object.assign(CANDS, " + json.dumps(CANDS, ensure_ascii=False) + ");",
       "const AR_RACES = " + json.dumps(RACES, ensure_ascii=False) + ";",
       "const AR_UNOPPOSED = " + json.dumps(UNOPPOSED, ensure_ascii=False) + ";",
       "const FACTCHECKS = " + json.dumps(FACTCHECKS, ensure_ascii=False) + ";"]
Path(__file__).with_name("ar.js").write_text("\n".join(out) + "\n")
print(f"data as of {asof} · races {len(contested)} · candidates {n_cands} · unopposed {n_unopp} · issues {len(ISSUES)} · fact-check names {len(FACTCHECKS)}")
for cid in ("cotton", "crawford", "hill", "womack", "westerman"):
    k = CANDS[cid]["kpi"]
    print(cid, {x: (k[x].get("status"), k[x].get("pct")) for x in ("attendance", "effectiveness", "bipartisan")}, k["funding"].get("display", "")[:70])
