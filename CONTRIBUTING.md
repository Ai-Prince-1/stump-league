# Contributing to Stump League

Live site: https://ai-prince-1.github.io/stump-league/

Stump League is an AI-assisted, open-source prototype. It has **no editors and no human reviewers yet**. This guide proposes how a community (for example political science students and civic-tech volunteers) can run it without one, borrowing from how Wikipedia works: every claim is sourced in public, every change is visible in public history, and pages about living people get extra protection.

Nothing here is a final policy. Propose changes to it by opening an issue.

## What the site will and won't do

- **Stats, not standings.** Five stats per candidate, labeled against a named peer group. No overall grade, no tiers, no default ranking.
- **Record, not prediction.** No forecasts, endorsements or "who should win."
- **Positions are shown, never scored.** Plans appear in the candidate's own words. Nobody's views are graded.
- **No money, ever.** The Play tab is fictional, uses points only and will never involve betting.

## Two kinds of changes

### 1. Official-record data (automated)
Stats with the **Official record** badge come from public datasets through the nightly pipeline (`pipeline/`). To change one, change the code, not the number:

1. Open a pull request against `pipeline/`.
2. Add or update a test in `tests/` that shows the change is correct.
3. The pull request passes if the tests pass and the nightly build's checks (race and candidate counts, wording guards) still pass.

A number is never edited by hand in the page.

### 2. Judgment items (two-person rule)
Anything that takes judgment — background facts, plan checklists (measurable / timeline / cost / within the office's power), debate and questionnaire classifications, ballot-issue explainers — follows this protocol:

1. **Source required.** Every claim links to a primary source or an established news outlet. No source, no change.
2. **Two people.** One person proposes (issue or pull request); a *different* person confirms the source says what the change says. Until then the item carries the **Draft** badge.
3. **Same rule for every side.** A change to one candidate's card should be checked against the other candidates in the race. Reviewers say in the pull request that they checked.
4. **Disclose ties.** Anyone who works or volunteers for a campaign, party or advocacy group in a race says so and doesn't confirm changes for that race.
5. **Campaign responses.** A campaign may submit a sourced response to any stat. After confirmation it appears beside the stat, not in place of it.

### Election freeze window
In the **14 days before an election**, judgment items for that election can only be *corrected* (a sourced factual error), not added. This limits last-minute pile-ons. Official-record data keeps updating nightly.

## Corrections

Use **Issues → New issue → Correction** (or the form on the Methodology page, which pre-fills one). Every correction stays public, open or closed, and the fix is a commit anyone can inspect. That issue list *is* the corrections log.

## Adopt a district (for students and volunteers)

Most Arkansas legislative cards are thin because state data isn't connected yet. A good first contribution:

1. Pick one contested race on the Races tab. Search the open issues to make sure nobody has claimed it, then open an issue titled "Adopt: <race>" (for example "Adopt: AR House 12") so nobody duplicates it.
2. For each candidate, collect: their campaign website, whether they answered the League of Women Voters' Vote411 or Ballotpedia's Candidate Connection questionnaire, and any nonpartisan debate or forum invitations (who hosted, who was invited, who accepted).
3. Add plans in the candidate's own words with links. Fill the checklist but leave it marked Draft.
4. Open one pull request per race. Ask someone else to confirm it (two-person rule).

Never collect home addresses, family details or anything about a candidate's private life.

## Rules for "Answers to voters" (the lead stat)

- **Debates** count only when a nonpartisan host invited every qualifying candidate. Accepting counts; declining counts against.
- **Questionnaires** count when a nonpartisan guide sent the same questions to every candidate and publishes who didn't respond.
- **Town halls** count when announced publicly at least two days ahead and open to any constituent.
- **Disclosures** count when a required financial-disclosure report was filed by its legal deadline.

## Code

- Site source is in `site-src/`; `python3 site-src/gen_ar.py . && sh site-src/build.sh` rebuilds `docs/index.html`.
- Run `pytest -q` before opening a pull request.
- API keys live only in the repository's GitHub Actions secrets. Never commit a key.
