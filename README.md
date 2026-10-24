# Stump League

**Know your ballot like you know your fantasy roster.**

Stump League is a nonpartisan prototype that presents candidates' records the way sports media presents players: what they promised, what they did, and how each number compares to the league. Every stat links to its official source. It scores performance and transparency, never policy positions, and it never tells anyone who to vote for.

- **Website:** `docs/`, served by GitHub Pages
- **Data pipeline:** `pipeline/`, run nightly by GitHub Actions
- **Coverage:** every contested race on Arkansas's Nov 3, 2026 ballot (50 races, 105 candidates), the 80 unopposed seats, the 4 statewide ballot issues, and Ohio's governor race as a second pilot

This is a proof of concept, built to be adopted and extended by a nonpartisan partner: a university research center, civic-tech foundation, nonprofit newsroom or voter-information organization.

## How it works

```
official records ──► pipeline/ (nightly) ──► data/*.json ──► docs/data/ ──► website
  Congress.gov, House Clerk, FEC,       tests, safe merge,        feed status and
  CEL scores, Census, fact-checks       sourced datapoints        stats on the site
```

Every value is saved with its source link, publisher and retrieval date. A failed or empty pull never overwrites a value a reviewer has verified; changed values are queued for review instead.

## Feeds

| Feed | Source | Stat it feeds | Key needed |
|---|---|---|---|
| `members` | @unitedstates congress-legislators | IDs linking every dataset | none |
| `zips` | Census ZCTA → 119th Congress districts | Ballot lookup | none |
| `cel` | Center for Effective Lawmaking | Lawmaking effectiveness | none* |
| `fec` | OpenFEC API | Campaign money (context, never scored) | `API_DATA_GOV_KEY` |
| `votes` | House Clerk roll-call XML | Attendance | none |
| `bills` | Congress.gov API | Bipartisanship | `API_DATA_GOV_KEY` |
| `factchecks` | Google Fact Check Tools API (ClaimReview) | Fact-check record | `GOOGLE_FACTCHECK_KEY` |

\* The CEL importer calls the endpoint CEL's own public score viewer uses. Ask CEL for permission, or switch to their official data downloads, before relying on it in production.

## Setup

1. **Get two free keys**
   - api.data.gov key (works for Congress.gov and OpenFEC): sign up at https://api.data.gov/signup/
   - Google Fact Check Tools key: in Google Cloud Console, enable "Fact Check Tools API" and create an API key
2. **Add them as repository secrets**: Settings → Secrets and variables → Actions → New repository secret, named `API_DATA_GOV_KEY` and `GOOGLE_FACTCHECK_KEY`.
3. **Run it**: Actions → Nightly data refresh → Run workflow. After that it runs every night on its own.

Without keys, the free feeds (members, ZIPs, CEL, House votes) still run, and FEC falls back to a heavily rate-limited demo key.

## Scope

`config.json` sets which races the nightly job covers. `"scope": "pilot"` keeps API use within free limits while the method is reviewed. Switching to `"all"` covers every member of Congress (about 539), which takes longer and needs your own api.data.gov key.

## Website source

`docs/index.html` is built from `site-src/`: `head.html` and `body.html` (markup and styles), `data.js` (pilot races and sources), `ar.js` (every contested Arkansas race, generated), `app.js` (scoring engine and interface) and `zipdata.js` (ZIP-to-district table). To refresh the Arkansas data embedded in the page after a nightly run:

```bash
cd site-src
python3 gen_ar.py ..     # rebuilds ar.js from ../data/*.json
sh build.sh              # writes stump-league.html; wrap it in a doctype as docs/index.html
```

On GitHub Pages the page also reads `docs/data/*.json` on load, so stats stay current between rebuilds.

## Run locally

```bash
pip install -r requirements.txt
pytest -q
python -m pipeline.build                       # all feeds, pilot scope
python -m pipeline.build --only members zips   # selected feeds
python -m pipeline.build --scope all           # every member
```

## Rules the code enforces

- No scoring function takes a party as input. The only function that sees parties is the bipartisanship counter, which compares a sponsor's party with cosponsors' parties. A test guards this.
- Campaign money and earmark dollars are stored as context and never scored.
- Fact-check stats stay hidden below 5 rated claims, with a caveat that fact-checkers choose which claims to check.
- Simple and concurrent resolutions are left out of bipartisanship counts because most are ceremonial.
- Promise ledgers are drafted with AI help and need sign-off from two human reviewers. They are not imported automatically.

## Status

- Run live while building: `members` (539 current members) and `zips` (33,774 ZIP codes).
- Checked against figures pulled by hand for the pilot: Womack's CEL score, his FEC totals, Ramaswamy's PolitiFact rulings. These figures are in the tests.
- Tested against sample responses only until the first nightly run: the House and Senate vote parsers, Congress.gov, ClaimReview.

## Not built yet

- Website cards reading candidate stats from `docs/data/` (today the site shows feed status from it; candidate stats are still embedded in the page)
- State campaign finance for governor races (Ohio's portal is run by the Secretary of State)
- A roster importer for challengers (until then, list them in `data/candidates.json` as `{fec_id: {name, race}}`)
- Governor stats: budgets, vetoes, executive orders
- Accounts, private leagues and drafts for the fantasy game

## License

Code is MIT-licensed. Data comes from the public sources listed above, each under its own terms.
