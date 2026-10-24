"""Generate ar.js: every contested Arkansas race on the Nov 3, 2026 ballot, the unopposed list,
and the ballot issues. Stats come from the pipeline's data files (official sources); facts from
the cited election references. Run after each data refresh to refresh the embedded copy."""
import json, re, sys
from pathlib import Path

REPO = Path(sys.argv[1] if len(sys.argv) > 1 else "/home/claude/stump-league")
J = lambda f: json.loads((REPO / "data" / f"{f}.json").read_text()) if (REPO / "data" / f"{f}.json").exists() else {}
CEL, CELS, ATT, SATT, BIP, FEC, FC = J("cel"), J("cel_state"), J("attendance"), J("senate_attendance"), J("bipartisanship"), J("fec"), J("factchecks")

SRC = {
  "wiki_arhouse": ["Wikipedia (from Arkansas Secretary of State filings)", "2026 Arkansas House of Representatives election", "retrieved Oct 23, 2026", "https://en.wikipedia.org/wiki/2026_Arkansas_House_of_Representatives_election"],
  "wiki_arsen": ["Wikipedia (from Arkansas Secretary of State filings)", "2026 Arkansas Senate election", "retrieved Oct 23, 2026", "https://en.wikipedia.org/wiki/2026_Arkansas_Senate_election"],
  "greenpapers_ar": ["The Green Papers", "Arkansas 2026 general election candidates", "retrieved Oct 23, 2026", "https://www.thegreenpapers.com/G26/AR"],
  "politics1_ar2": ["Politics1", "Arkansas candidate guide (candidate descriptions)", "retrieved Oct 23, 2026", "https://politics1.com/ar.htm"],
  "artv_debates": ["Arkansas Advocate", "Arkansas TV announces lineup of state, federal debates", "Sep 25, 2026", "https://www.newsfromthestates.com/article/arkansas-tv-announces-lineup-state-federal-debates-next-month"],
  "senate_debate_off": ["Arkansas Advocate", "Debate in Arkansas U.S. Senate race won't take place", "Oct 14, 2026", "https://www.newsfromthestates.com/article/debate-arkansas-us-senate-race-wont-take-place-cotton-and-shoffner-campaigns-say"],
  "hd8_special": ["Arkansas Advocate", "2 candidates file for Arkansas House vacancy", "Aug 28, 2026", "https://www.newsfromthestates.com/article/2-candidates-file-arkansas-house-vacancy-created-lawmakers-resignation"],
  "uaex_guide": ["University of Arkansas Cooperative Extension Service", "2026 Arkansas Ballot Issues Voter Guide", "Oct 2026", "https://www.uaex.uada.edu/business-communities/voter-education/docs/2026-Arkansas-Ballot-Issues-Voter-Guide.pdf"],
  "cel_state_src": ["Center for Effective Lawmaking", "State Legislative Effectiveness Scores, Arkansas 2023–24", "retrieved Oct 24, 2026", "https://thelawmakers.org/state-highlights"],
  "cel_fed_src": ["Center for Effective Lawmaking", "Legislative Effectiveness Scores, 118th Congress", "retrieved Oct 24, 2026", "https://thelawmakers.org/find-representatives"],
  "clerk_src": ["Office of the Clerk, U.S. House", "Roll-call votes, 2025–2026", "retrieved Oct 24, 2026", "https://clerk.house.gov/Votes"],
  "voteview_src": ["Voteview (UCLA), from U.S. Senate roll calls", "Senate roll-call votes, 119th Congress", "retrieved Oct 24, 2026", "https://voteview.com/congress/senate/119"],
  "cg_src": ["Congress.gov", "Sponsored legislation and cosponsors, 119th Congress", "retrieved Oct 24, 2026", "https://www.congress.gov/"],
  "claimreview_src": ["Google Fact Check Tools (ClaimReview): PolitiFact, The Washington Post, FactCheck.org", "Fact-check rulings", "retrieved Oct 24, 2026", "https://toolbox.google.com/factcheck/explorer"],
  "sos_voterview": ["Arkansas Secretary of State", "Elections: Voter View (registration, polling place, sample ballot)", "2026", "https://www.sos.arkansas.gov/elections"],
}
def fec_src(cid):
    key = "fec_" + cid
    SRC[key] = ["Federal Election Commission", f"{cid} 2025–2026 financial summary", "through " + (FEC.get(cid, {}).get("value", {}).get("coverage_end_date") or "")[:10], f"https://www.fec.gov/data/candidate/{cid}/?cycle=2026"]
    return key

# ---------------------------------------------------------------- helpers
def slug(s): return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
def initials(n):
    parts = [p for p in re.split(r"[\s.]+", n) if p and p[0].isalpha() and p.lower() not in ("jr", "iii", "ii")]
    return (parts[0][0] + parts[-1][0]).upper()
PARTY = {"R": "Republican", "D": "Democratic", "L": "Libertarian", "I": "Independent"}
pct = lambda x, d=0: f"{100*x:.{d}f}%"
def money(x): return f"${x/1e6:.2f}M" if x >= 1e6 else f"${x/1e3:.1f}K"
def ordn(n):
    n = int(n); s = ["th", "st", "nd", "rd"]; v = n % 100
    return f"{n}{s[(v-20)%10] if (v-20)%10 < 4 else s[0]}" if not 10 <= v <= 20 else f"{n}th"
def ordinal(n):
    n = int(n)
    if 10 <= n % 100 <= 20: return f"{n}th"
    return f"{n}{ {1:'st',2:'nd',3:'rd'}.get(n%10,'th') }"

def na(): return {"status": "na"}
def pend(note): return {"status": "pending", "note": note}

def cel_fed(b):
    v = CEL.get(b, {}).get("value")
    if not v: return pend("Not imported yet.")
    word = {"MEETS": "meets", "EXCEEDS": "exceeds", "BELOW": "below"}[v["expectation"]]
    return {"status": "verified", "norm": v["norm"], "display": f'{v["les"]:.2f} LES · {word} expectations',
            "sub": f'Benchmark for members like this: {v["benchmark"]:.2f} · {ordinal(v["party_rank"])} of {v["party_total"]} in the same party · {v["congress"]}th Congress', "src": "cel_fed_src"}

def find_sles(last, chamber=None, district=None):
    hits = []
    for k, d in CELS.items():
        v = d["value"]
        if v["name"].split(",")[0].strip().lower() != last.lower(): continue
        if chamber and v["chamber"] != chamber: continue
        if district is not None and str(v["district"]) != str(district): continue
        hits.append((k, v))
    return hits[0] if len(hits) == 1 else (None, None)

def cel_state(last, chamber, district, role_note):
    k, v = find_sles(last, chamber, district)
    if not v: return None, None
    word = {"MEETS": "meets", "EXCEEDS": "exceeds", "BELOW": "below"}[v["expectation"]]
    ch = "House" if chamber == "lower" else "Senate"
    st = {"status": "verified", "norm": v["norm"], "display": f'{v["sles"]:.2f} SLES · {word} expectations',
          "sub": f'Benchmark {v["benchmark"]:.2f} · {ordinal(v["party_rank"])} of {v["party_total"]} {"majority" if v["majority"] else "minority"}-party members · Arkansas {ch} 2023–24',
          "src": "cel_state_src"}
    if role_note: st["note"] = role_note
    return st, k

def house_att(b):
    v = ATT.get(b, {}).get("value")
    if not v: return pend("Not imported yet.")
    return {"status": "verified", "norm": v["norm"], "display": f'{v["missed"]} of {v["total"]} roll calls missed ({pct(v["missed"]/v["total"],1)})',
            "sub": "119th Congress, since Jan 3, 2025", "src": "clerk_src"}

def senate_att(b):
    v = SATT.get(b, {}).get("value")
    if not v: return pend("Not imported yet.")
    return {"status": "verified", "norm": v["norm"], "display": f'{v["missed"]} of {v["total"]} roll calls missed ({pct(v["missed"]/v["total"],1)})',
            "sub": "119th Congress, since Jan 3, 2025", "src": "voteview_src", "note": "Paired and announced positions count as absences."}

def bip(b):
    v = BIP.get(b, {}).get("value")
    if not v: return pend("Not imported yet.")
    n = round(v["share"] * v["bills"])
    return {"status": "verified", "norm": v["share"], "display": f'{pct(v["share"])} of bills',
            "sub": f'{n} of {v["bills"]} bills and joint resolutions drew a cosponsor from another party · 119th Congress', "src": "cg_src"}

GOOD = {"true", "mostly true", "correct", "accurate", "mostly correct", "mostly accurate", "geppetto checkmark", "one pinocchio"}
def factcheck(name, note=None):
    d = FC.get(name, {}).get("value")
    if not d or d.get("norm") is None:
        n = (d or {}).get("n", 0)
        return pend(f"{n} rated claim{'s' if n != 1 else ''} found; minimum is 5.")
    good = sum(1 for r in d["reviews"] if (r.get("rating") or "").lower() in GOOD)
    pubs = sorted({r["publisher"] for r in d["reviews"] if r.get("publisher")})
    st = {"status": "verified", "norm": d["norm"], "display": f'{good} of {d["n"]} rated mostly true or better',
          "sub": f'{d["n"]} scored rulings from {", ".join(pubs)}' + (f' · {d["unmapped"]} more use labels outside the standard scale and aren\'t scored' if d["unmapped"] else ""),
          "src": "claimreview_src"}
    st["note"] = (note + " " if note else "") + "Fact-checkers choose which claims to check, so the mix reflects attention as well as accuracy."
    return st

def money_block(cid):
    d = FEC.get(cid, {}).get("value")
    if not d or not d.get("receipts"): return None
    r = d["receipts"]
    return {"asOf": d.get("coverage_end_date", "")[:10], "src": fec_src(cid), "items": [
        {"label": "Raised this cycle", "value": money(r)},
        {"label": "From PACs and party committees", "value": pct(d["pac_share"], 1), "sub": money(r * d["pac_share"])},
        {"label": "From donors giving $200 or less", "value": pct(d["small_donor_share"], 1), "sub": money(r * d["small_donor_share"])}],
        "note": f'Larger individual donors gave {pct(d["large_donor_share"])} ({money(r * d["large_donor_share"])}).'}

DEBATED = {"status": "verified", "norm": 1, "display": "Debated", "sub": "Arkansas TV, October 2026", "src": "artv_debates"}

# ---------------------------------------------------------------- federal + statewide definitions
CONG = {
  "house": {"can": ["Write, sponsor and vote on federal bills", "Request Community Project Funding (earmarks) for local projects", "Oversee federal agencies through committee work"],
            "cant": ["Pass anything alone; 218 House votes and the Senate are needed", "Set state or local taxes"]},
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

RACES, CANDS = [], {}

def add_cand(cid, **c):
    c.setdefault("initials", initials(c["name"]))
    CANDS[cid] = c
    return cid

def base_stats(rookie=True):
    s = {"promises": na() if rookie else pend("Promise ledger not built yet."), "effectiveness": na(), "attendance": na(), "bipartisan": na(),
         "access": pend("No nonpartisan debate found yet."), "transparency": pend("Questionnaire tracking not yet complete."),
         "factcheck": pend("Fewer than 5 rated claims found."), "specificity": pend("No sourced promises collected yet.")}
    return s

def fed_incumbent(cid, name, party, role, bioguide, fecid, chamber, access, extra_facts=()):
    s = base_stats(rookie=False)
    s["effectiveness"] = cel_fed(bioguide)
    s["attendance"] = house_att(bioguide) if chamber == "house" else senate_att(bioguide)
    s["bipartisan"] = bip(bioguide)
    s["access"] = access
    s["factcheck"] = factcheck(name)
    return add_cand(cid, name=name, party=party, role=role, track="veteran", stats=s,
                    ids={"bioguide": bioguide, "fec": fecid, "factcheck": name},
                    facts=[{"label": "Office", "text": role + ".", "src": "greenpapers_ar"}] + list(extra_facts),
                    money=money_block(fecid), promises=[], positions={})

def challenger(cid, name, party, role, desc, fecid=None, access=None, prior=None):
    s = base_stats()
    if access: s["access"] = access
    s["factcheck"] = factcheck(name)
    facts = [{"label": "Background", "text": desc + ".", "src": "politics1_ar2"}] if desc else []
    if prior:
        st, k = prior
        if st:
            s["effectiveness"] = st
    c = dict(name=name, party=party, role=role, track="rookie", stats=s, ids={"factcheck": name}, facts=facts, promises=[], positions={})
    if fecid:
        c["ids"]["fec"] = fecid
        c["money"] = money_block(fecid)
    if prior and prior[1]:
        c["ids"]["sles"] = prior[1]
    return add_cand(cid, **c)

def race(rid, short, name, office, level, blurb, cands, context=(), canSrc=None):
    d = dict(id=rid, short=short, name=name, state="Arkansas", office=office, level=level, election="Nov 3, 2026", sample=False,
             blurb=blurb, candidates=cands, context=list(context))
    d.update({"can": (CONG.get(office) or STATE_OFFICES[office])["can"], "cant": (CONG.get(office) or STATE_OFFICES[office])["cant"]})
    if canSrc: d["canSrc"] = canSrc
    RACES.append(d)

COTTON_ACCESS = {"status": "verified", "norm": 0, "display": "Declined Arkansas TV debate",
                 "sub": "Had accepted a Salem Media debate, which the host withdrew; that invitation didn't include all qualifying candidates", "src": "senate_debate_off", "src2": "artv_debates"}

# U.S. Senate
race("ar-sen", "AR-SEN", "U.S. Senate · Arkansas", "senate", "congress",
     "A two-term incumbent faces a farmer and a business consultant. The challengers debated on public TV; the incumbent declined.",
     [fed_incumbent("cotton", "Tom Cotton", "Republican", "U.S. senator since 2015", "C001095", "S4AR00103", "senate", COTTON_ACCESS),
      challenger("shoffner", "Hallie Shoffner", "Democratic", "Challenger", "Farmer", "S6AR00199", DEBATED),
      challenger("wadlin", "Jeff Wadlin", "Libertarian", "Challenger", "Business consultant and 2018 justice of the peace candidate", "S6AR00223", DEBATED)],
     [{"text": "Arkansas TV hosted a Senate debate on Oct 12 with Shoffner and Wadlin; Cotton declined.", "src": "artv_debates"},
      {"text": "A separate Cotton–Shoffner debate offered by Salem Media was withdrawn by the host. Cotton also declined an Oct 22 ASU-TV debate with Shoffner and Wadlin.", "src": "senate_debate_off"}])

# U.S. House 1, 2, 4 (3 exists already in data.js and is updated there)
race("ar1", "AR-1", "U.S. House · Arkansas 1st District", "house", "congress", "Eastern Arkansas. An eight-term incumbent faces a retired pathologist and a Libertarian.",
     [fed_incumbent("crawford", "Rick Crawford", "Republican", "U.S. representative since 2011", "C001087", "H0AR01083", "house", DEBATED),
      challenger("ygreen", "Terri Yarbrough Green", "Democratic", "Challenger", "Retired pathologist", "H6AR01155", DEBATED),
      challenger("parsons", "Steve Parsons", "Libertarian", "Challenger", "Retired consultant; 2024 nominee for this seat and 2022 state representative nominee", None, DEBATED)],
     [{"text": "Arkansas TV hosted a debate with all three nominees in October 2026.", "src": "artv_debates"}])
race("ar2", "AR-2", "U.S. House · Arkansas 2nd District", "house", "congress", "Central Arkansas, including Little Rock. A six-term incumbent faces the 2022 Democratic nominee for governor.",
     [fed_incumbent("hill", "French Hill", "Republican", "U.S. representative since 2015", "H001072", "H4AR02141", "house", DEBATED),
      challenger("cjones", "Chris Jones", "Democratic", "Challenger", "Nuclear engineer, pastor and nonprofit executive; 2022 Democratic nominee for governor", "H6AR02286", DEBATED)],
     [{"text": "Arkansas TV hosted a debate with both nominees in October 2026.", "src": "artv_debates"}])
race("ar4", "AR-4", "U.S. House · Arkansas 4th District", "house", "congress", "Southern and western Arkansas. A six-term incumbent faces a medical office manager and National Guard veteran.",
     [fed_incumbent("westerman", "Bruce Westerman", "Republican", "U.S. representative since 2015", "W000821", "H4AR04048", "house", DEBATED),
      challenger("rrussell", "Rus Russell", "Democratic", "Challenger", "Medical office manager and National Guard veteran; 2020 candidate for governor", "H6AR04084", DEBATED)],
     [{"text": "Arkansas TV hosted a debate with both nominees in October 2026.", "src": "artv_debates"}])

# Statewide
def exec_incumbent(cid, name, role, access, fc_note=None):
    s = base_stats(rookie=False)
    s["effectiveness"] = {"status": "na", "note": "Applies to legislators"}
    s["access"] = access or s["access"]
    s["factcheck"] = factcheck(name, fc_note)
    return add_cand(cid, name=name, party="Republican", role=role, track="veteran", stats=s, ids={"factcheck": name},
                    facts=[{"label": "Office", "text": role + ".", "src": "greenpapers_ar"}], promises=[], positions={})

love_prior = cel_state("Love", "upper", 15, "As a state senator, 2023–24.")
race("ar-gov", "AR-GOV", "Governor · Arkansas", "governor", "statewide", "The incumbent governor faces a state senator and an oil rig operations supervisor.",
     [exec_incumbent("sanders", "Sarah Huckabee Sanders", "Governor since 2023", DEBATED, "Most date from her 2017–19 role as White House press secretary, speaking for the administration."),
      challenger("flove", "Fred Love", "Democratic", "Challenger", "State senator and former state representative", None, DEBATED, love_prior),
      challenger("shelby", "Colt Shelby", "Libertarian", "Challenger", "Oil rig operations supervisor and farmer", None, DEBATED)],
     [{"text": "Arkansas TV hosted a debate with all three nominees on Oct 13, 2026.", "src": "artv_debates"}])
race("ar-ltgov", "AR-LTGOV", "Lieutenant Governor · Arkansas", "ltgov", "statewide", "The incumbent faces a Libertarian teacher, firefighter and Navy veteran. No Democrat is on the ballot.",
     [exec_incumbent("rutledge", "Leslie Rutledge", "Lieutenant governor since 2023", None),
      challenger("kalagias", "Mike Kalagias", "Libertarian", "Challenger", "Teacher, firefighter and Navy veteran")])
hammer_prior = cel_state("Hammer", "upper", 16, "As a state senator, 2023–24.")
race("ar-sos", "AR-SOS", "Secretary of State · Arkansas", "sos", "statewide", "An open seat. A state senator, a marketing specialist and an economist are running for the office that oversees elections.",
     [challenger("hammer", "Kim Hammer", "Republican", "Open-seat candidate", "State senator, Baptist pastor and radio show host", None, DEBATED, hammer_prior),
      challenger("grappe", "Kelly Grappe", "Democratic", "Open-seat candidate", "Marketing specialist and community activist", None, DEBATED),
      challenger("pakko", "Michael Pakko", "Libertarian", "Open-seat candidate", "Economist; 2024 Libertarian nominee for state treasurer", None, DEBATED)],
     [{"text": "Arkansas TV hosted a debate with all three nominees on Oct 15, 2026.", "src": "artv_debates"}])
race("ar-lands", "AR-LANDS", "Commissioner of State Lands · Arkansas", "lands", "statewide", "An open seat. The current secretary of state faces a Libertarian. No Democrat is on the ballot.",
     [challenger("jester", "Cole Jester", "Republican", "Open-seat candidate", "Current secretary of state, former aide to the governor and attorney"),
      challenger("olson", "Chris Olson", "Libertarian", "Open-seat candidate", "Mental health worker and Libertarian activist")])

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

def parse_line(line):
    d, rest = line.split("|")
    out = []
    for tok in rest.split(";"):
        tok = tok.strip()
        inc = "*" in tok
        m = re.match(r"(.+?)\*?\s?([RDLI])$", tok.replace("*", " ").strip())
        name, p = m.group(1).strip(), m.group(2)
        out.append((name, p, inc))
    return int(d), out

# Former legislators running for a different seat (matched to their 2023–24 district)
MOVERS = {("lower", 24, "Fite"): ("lower", 24), ("upper", 13, "Achor"): ("lower", 71)}

def leg_cands(chamber, dist, people, race_id):
    ids = []
    chname = "House" if chamber == "lower" else "Senate"
    open_seat = not any(inc for _, _, inc in people)
    for name, p, inc in people:
        last = name.replace(" Jr.", "").split()[-1]
        cid = f"{race_id}-{slug(last)}"
        role = f"Incumbent, Arkansas {chname} District {dist}" if inc else ("Open-seat candidate" if open_seat else "Challenger")
        s = base_stats(rookie=not inc)
        if inc:
            s["promises"] = pend("Promise ledger not built yet.")
            s["attendance"] = pend("Arkansas legislature vote records not connected yet.")
            s["bipartisan"] = pend("Arkansas legislature bill records not connected yet.")
        c = dict(name=name, party=PARTY[p], role=role, track="veteran" if inc else "rookie", stats=s, ids={},
                 facts=[{"label": "On the ballot", "text": role + "." if inc else f"{role} for Arkansas {chname} District {dist}.", "src": "wiki_arhouse" if chamber == "lower" else "wiki_arsen"}],
                 promises=[], positions={})
        mv = MOVERS.get((chamber, dist, last))
        lookup = mv if mv else ((chamber, dist) if inc else None)
        if lookup:
            note = None if (inc and not mv) else f"As a state {'representative' if lookup[0]=='lower' else 'senator'}, 2023–24 (District {lookup[1]})."
            st, k = cel_state(last, lookup[0], lookup[1], note)
            if st:
                s["effectiveness"] = st
                c["ids"]["sles"] = k
                if not inc:
                    c["facts"].append({"label": "Prior office", "text": f"Served in the Arkansas {'House' if lookup[0]=='lower' else 'Senate'} (District {lookup[1]}) in 2023–24.", "src": "cel_state_src"})
            elif inc:
                s["effectiveness"] = pend("No 2023–24 score; likely first elected in 2024 or later.")
        add_cand(cid, **c)
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
         [{"text": "All 100 Arkansas House seats are on the ballot; about two-thirds are unopposed.", "src": "wiki_arhouse"}])
# HD-8 special election (rest of the current term)
race("ar-hd8s", "HD-8 SPECIAL", "Arkansas House · District 8 special election", "state-house", "state-house",
     "Fills the rest of the current term, through January 2027, after the incumbent resigned. Brian Armas (R) is unopposed for the full term that follows.",
     [add_cand("ar-hd8s-armas", name="Kara Armas", party="Republican", role="Special-election candidate", track="rookie", stats=base_stats(), ids={},
               facts=[{"label": "On the ballot", "text": "Candidate for the District 8 special election; wife of Brian Armas, who is unopposed for the next full term.", "src": "hd8_special"}], promises=[], positions={}),
      add_cand("ar-hd8s-stohlton", name="Parker Stohlton", party="Democratic", role="Special-election candidate", track="rookie", stats=base_stats(), ids={},
               facts=[{"label": "On the ballot", "text": "Candidate for the District 8 special election, from Bella Vista.", "src": "hd8_special"}], promises=[], positions={})],
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

# ---------------------------------------------------------------- output
contested = [r for r in RACES if r["level"] != "issues"]
out = ["/* Arkansas: every contested race on the Nov 3, 2026 ballot. Generated by gen_ar.py from the pipeline's data files. */"]
out.append("Object.assign(SOURCES, " + json.dumps({k: {"pub": v[0], "title": v[1], "date": v[2], "url": v[3]} for k, v in SRC.items()}, ensure_ascii=False) + ");")
out.append("Object.assign(CANDS, " + json.dumps(CANDS, ensure_ascii=False) + ");")
out.append("const AR_RACES = " + json.dumps(RACES, ensure_ascii=False) + ";")
out.append("const AR_UNOPPOSED = " + json.dumps(UNOPPOSED, ensure_ascii=False) + ";")
Path(__file__).with_name("ar.js").write_text("\n".join(out) + "\n")
n_unopp = sum(len(v) for v in UNOPPOSED.values())
print(f"races {len(contested)} (+ AR-3 in data.js = {len(contested)+1}) · candidates {len(CANDS)} · unopposed {n_unopp} · issues {len(ISSUES)}")
no_money = [c["name"] for c in CANDS.values() if c.get("ids", {}).get("fec") and not c.get("money")]
print("fec without money:", no_money)
print("legislative scores:", sum(1 for c in CANDS.values() if c.get("ids", {}).get("sles")))
