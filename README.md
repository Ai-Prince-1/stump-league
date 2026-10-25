# Stump League

**Know your ballot like you know your fantasy roster.**

### 🔗 Live site: **https://ai-prince-1.github.io/stump-league/**

Stump League is a nonpartisan, open-source prototype that presents candidates the way sports media scouts players: who they are, what they did and what they plan. Each candidate gets a scouting report of five stats, each compared with a named peer group and linked to its public source.

It gives **no overall grade**, never scores policy positions or how anyone voted on an issue, and never tells anyone who to vote for. A ranking appears only when a voter asks for one, built from the stats *they* choose.

**Coverage:** every contested race on Arkansas's Nov 3, 2026 ballot (50 races, 105 candidates), the 80 unopposed seats, plain-language explainers for the 4 statewide ballot issues, and Ohio's governor race as a second pilot.

> **Status:** AI-assisted prototype. No human has reviewed it yet. Official-record stats are imported automatically by code anyone can read; everything that took judgment is marked **Draft** on the site. It's built for people with more technical and political expertise (civic-tech groups, newsrooms, university centers, political science students) to adopt, check and extend.

## The five stats

| Stat | Voter's question | Measure | Source | Applies to |
|---|---|---|---|---|
| **Answers to voters** (lead stat) | Will they face me? | Nonpartisan debates accepted; questionnaires, town halls and on-time disclosures as they're collected | Debate hosts; voter guides | Everyone |
| **Who funds them** | Who do they owe? | Small-donor, in-state and PAC shares | FEC | Everyone with filings |
| **Shows up** | Do they do the job? | Share of recorded votes cast | House Clerk; Voteview | Officeholders |
| **Gets results** | Can they get anything done? | Legislative Effectiveness Score vs. the benchmark for similar members | Center for Effective Lawmaking | Legislators |
| **Works across lines** | Will they work with the other side? | Bipartisan Index | The Lugar Center | Members of Congress |

**Who funds them** and **Works across lines** start switched off in "Your ranking" because voters disagree about whether they matter. Plans (candidates' own words with an unscored checklist), fact-check rulings (a dated list, never a rate) and earmark dollars appear on each report as context only. The full method is on the site's Methodology tab.

## How it works

```
official records ──► pipeline/ (nightly) ──► data/*.json ──► site-src/gen_ar.py ──► docs/index.html ──► GitHub Pages
                     tests + safe merge                       rebuilds the page,
                                                              checks counts and wording
```

A GitHub Actions job (`.github/workflows/nightly.yml`) runs every night at 08:17 UTC:

1. Runs the tests.
2. Pulls every feed. A failed or empty pull never overwrites a saved value.
3. Rebuilds the website from the new data and runs the tests again. If any check fails, it keeps the previous page instead of publishing a broken one.
4. Commits the data and page, and GitHub Pages republishes the site.

The page also reads `docs/data/manifest.json` so the Methodology tab shows each feed's real status and last pull date.

## Data feeds

| Feed | Source | Feeds | Key |
|---|---|---|---|
| `members` | @unitedstates congress-legislators | IDs linking every dataset | none |
| `zips` | Census ZCTA → 119th Congress districts | Ballot lookup | none |
| `cel` | Center for Effective Lawmaking (Congress) | Gets results | none* |
| `cel_state` | Center for Effective Lawmaking (state legislatures) | Gets results, Arkansas legislators | none* |
| `fec` | OpenFEC: totals, candidate roster, contributions by state | Who funds them | `API_DATA_GOV_KEY` |
| `votes` | House Clerk roll-call XML | Shows up (House) | none |
| `senate_votes` | Voteview (senate.gov blocks automated downloads) | Shows up (Senate) | none |
| `bills` | Congress.gov API | Cosponsorship detail | `API_DATA_GOV_KEY` |
| `factchecks` | Google Fact Check Tools API (ClaimReview) | Fact-check list | `GOOGLE_FACTCHECK_KEY` |
| `lugar` | The Lugar Center Bipartisan Index (2023) | Works across lines | imported by hand in `data/lugar.json` |

\* The CEL importer calls the endpoint CEL's public score viewer uses. Ask CEL for permission, or switch to their official downloads, before relying on it in production.

## Setup (for a fork)

1. **Get two free keys:** an api.data.gov key (covers Congress.gov and OpenFEC) at https://api.data.gov/signup/, and a Google Fact Check Tools API key from Google Cloud Console.
2. **Add them as repository secrets** (Settings → Secrets and variables → Actions) named `API_DATA_GOV_KEY` and `GOOGLE_FACTCHECK_KEY`. Never commit a key.
3. **Turn on GitHub Pages:** Settings → Pages → Deploy from a branch → `main`, folder `/docs`.
4. **Run it:** Actions → Nightly data refresh → Run workflow. After that it runs every night.

Without keys, the free feeds still run, and FEC falls back to a heavily rate-limited demo key.

## Scope

`config.json` sets what the nightly job covers. `"scope": "pilot"` (the default) covers Arkansas's federal delegation and candidates, Arkansas's legislature and the Ohio governor pilot, which keeps API use within free limits. `"all"` covers every member of Congress (about 539) and needs your own api.data.gov key.

## Website source

`docs/index.html` is generated; edit `site-src/` instead:

| File | What it holds |
|---|---|
| `head.html`, `body.html` | Styles and page structure |
| `data.js` | Sources, the five stats, Ohio and sample races, lessons, the fictional Play league |
| `gen_ar.py` → `ar.js` | Every Arkansas race, built from `data/*.json` (don't edit `ar.js` by hand) |
| `app.js` | Interface: ballot lookup, stat sheets, Your ranking, head-to-head, methodology |
| `zipdata.js` | ZIP-to-district table |

```bash
python3 site-src/gen_ar.py .    # rebuild ar.js from data/
sh site-src/build.sh            # write docs/index.html
pytest -q                       # includes page checks
```

## Run the pipeline locally

```bash
pip install -r requirements.txt
pytest -q
python -m pipeline.build                       # all feeds, pilot scope
python -m pipeline.build --only members zips   # selected feeds
python -m pipeline.build --scope all           # every member of Congress
```

## Rules the code enforces

- **No party input.** No scoring formula takes a party as input (a test checks this).
- **Peer groups always shown.** Category labels like "Top 25% of House members" always name the peer group.
- **Your ranking stays fair.** It uses only stats every candidate in the race has, so challengers are never ranked on a voting record they can't have, and ties are shown as ties.
- **Nothing silently replaced.** A failed or empty pull never overwrites a saved value.
- **Counts are checked.** The page build fails if the race, candidate, unopposed-seat or ballot-issue counts change unexpectedly.
- **The House-vote wording is guarded.** A test fails the build if the page claims a bill needs "218 votes." It needs a majority of the members voting; 218 is that majority only when all 435 seats are filled and everyone votes.
- **Sample data is labeled.** Invented data appears only in the labeled sample race and the fictional Play league.

## Corrections and contributing

Corrections happen in public. Open an issue with the **Correction** template (or use the form on the site's Methodology tab), and every fix is a commit anyone can inspect. [CONTRIBUTING.md](CONTRIBUTING.md) proposes an automated, Wikipedia-style review protocol: sources required, a second person confirms any judgment item, a freeze before elections, and an "adopt a district" guide for students and volunteers.

## Not built yet

- **Answers to voters** beyond debates: questionnaires, town halls and disclosure timeliness
- Arkansas legislature roll calls and state campaign finance
- Executive stats for governors: budgets on time, vetoes, executive actions
- Votes on topics a voter chooses (federal first)
- Constituent service, which has no public data and isn't measured
- Accounts and real leagues for the Play tab (today it's a fictional demo, and it will never involve money)

## License

Code is MIT-licensed. Data comes from the public sources above, each under its own terms.
