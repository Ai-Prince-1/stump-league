"""Turn raw official numbers into the 0–1 stats the site scores.
These formulas are published on the Methodology page; change them there and here together."""
from __future__ import annotations

# --- Lawmaking effectiveness (Center for Effective Lawmaking) ---
def cel_expectation(les: float, benchmark: float | None) -> str:
    """CEL's own rule (from their public viewer): below 50% of benchmark = BELOW,
    above 150% = EXCEEDS, otherwise MEETS."""
    if benchmark is None:
        return "MEETS"
    if les < benchmark * 0.5:
        return "BELOW"
    if les <= benchmark * 1.5:
        return "MEETS"
    return "EXCEEDS"


def effectiveness_norm(les: float, benchmark: float) -> float:
    """Meeting the benchmark exactly scores 0.50; double the benchmark or more scores 1.0."""
    return round(min(1.0, (les / benchmark) / 2), 3)


# --- Attendance (roll calls) ---
def attendance_norm(missed: int, total: int) -> float:
    """0% missed = 1.0; 20% or more missed = 0. League median (~2.2%) lands near 0.89."""
    if total <= 0:
        raise ValueError("no roll calls")
    pct = 100 * missed / total
    return round(max(0.0, 1 - pct / 20), 3)


# --- Fact-checks ---
RATING_SCALE = {
    # PolitiFact
    "true": 1.0, "mostly true": 0.75, "half true": 0.5, "half-true": 0.5,
    "mostly false": 0.25, "false": 0.0, "pants on fire": 0.0, "pants on fire!": 0.0,
    # Common ClaimReview labels from other fact-checkers
    "correct": 1.0, "accurate": 1.0, "mostly correct": 0.75, "mostly accurate": 0.75,
    "misleading": 0.25, "needs context": 0.5, "missing context": 0.5, "incorrect": 0.0, "inaccurate": 0.0,
    "four pinocchios": 0.0, "three pinocchios": 0.25, "two pinocchios": 0.5, "one pinocchio": 0.75, "geppetto checkmark": 1.0,
}
MIN_FACTCHECKS = 5


def factcheck_norm(ratings: list[str]) -> tuple[float | None, int, int]:
    """Returns (score or None if below minimum sample, n scored, n unmapped)."""
    vals, unmapped = [], 0
    for r in ratings:
        v = RATING_SCALE.get(r.strip().lower().rstrip("."))
        if v is None:
            unmapped += 1
        else:
            vals.append(v)
    if len(vals) < MIN_FACTCHECKS:
        return None, len(vals), unmapped
    return round(sum(vals) / len(vals), 3), len(vals), unmapped


# --- Bipartisanship ---
def bipartisan_share(sponsor_party: str, bills_cosponsor_parties: list[list[str]]) -> tuple[float | None, int]:
    """Share of sponsored bills with at least one cosponsor from a different party.
    Independents count as a different party from both major parties."""
    n = len(bills_cosponsor_parties)
    if n == 0:
        return None, 0
    cross = sum(1 for parties in bills_cosponsor_parties if any(p and p != sponsor_party for p in parties))
    return round(cross / n, 3), n


# --- Campaign money (context only, never scored) ---
def money_mix(t: dict) -> dict:
    receipts = float(t.get("receipts") or 0)
    if receipts <= 0:
        return {"receipts": receipts}
    pac = float(t.get("other_political_committee_contributions") or 0) + float(t.get("political_party_committee_contributions") or 0)
    small = float(t.get("individual_unitemized_contributions") or 0)
    large = float(t.get("individual_itemized_contributions") or 0)
    return {
        "receipts": round(receipts, 2),
        "pac_share": round(pac / receipts, 4),
        "small_donor_share": round(small / receipts, 4),
        "large_donor_share": round(large / receipts, 4),
        "self_funding": round(float(t.get("candidate_contribution") or 0), 2),
        "coverage_end_date": t.get("coverage_end_date"),
    }
