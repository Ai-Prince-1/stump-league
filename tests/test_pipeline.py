"""Parser and formula tests against saved samples, including figures checked by hand
for the pilot (Womack's CEL score, FEC totals; Ramaswamy's PolitiFact rulings)."""
import pytest

from pipeline import transforms as T
from pipeline import sources as S
from pipeline.common import merge_safe


def test_cel_womack_118():
    payload = {"congress": 118, "data": [{"congress": 118, "chamber": "H", "state": "AR", "bioguide": "W000809",
               "name": "Womack, Steve", "party": "R", "district": 3, "les": 1.0267887, "benchmark": 1.481222,
               "partyRank": 134, "partyTotal": 228, "iles": {}}]}
    v = S.parse_cel_table(payload)["W000809"]["value"]
    assert v["expectation"] == "MEETS"
    assert v["norm"] == pytest.approx(0.347, abs=1e-3)
    assert v["party_rank"] == 134


@pytest.mark.parametrize("les,bench,exp", [(0.7, 1.5, "BELOW"), (2.3, 1.5, "EXCEEDS"), (1.5, 1.5, "MEETS"), (1.0, None, "MEETS")])
def test_cel_expectation(les, bench, exp):
    assert T.cel_expectation(les, bench) == exp


def test_fec_womack_mix():
    payload = {"results": [{"cycle": 2026, "receipts": 2363074.02, "individual_itemized_contributions": 1104844.50,
                            "individual_unitemized_contributions": 37774.49, "other_political_committee_contributions": 1070750.00,
                            "political_party_committee_contributions": 0, "candidate_contribution": 0, "coverage_end_date": "2026-10-14"}]}
    v = S.parse_fec_totals("H0AR03055", payload, 2026)["value"]
    assert v["pac_share"] == pytest.approx(0.4531, abs=1e-4)
    assert v["small_donor_share"] == pytest.approx(0.0160, abs=1e-4)


def test_fec_wrong_cycle_returns_none():
    assert S.parse_fec_totals("X", {"results": [{"cycle": 2024, "receipts": 1}]}, 2026) is None


def test_factcheck_ramaswamy_politifact():
    ratings = ["Mostly True"] + ["Half True"] * 3 + ["Mostly False"] * 2 + ["False"] * 3 + ["Pants on Fire"] * 3
    score, n, unmapped = T.factcheck_norm(ratings)
    assert (n, unmapped) == (12, 0)
    assert score == pytest.approx(0.229, abs=1e-3)


def test_factcheck_minimum_sample():
    assert T.factcheck_norm(["Mostly False"])[0] is None


def test_attendance_womack_119():
    assert T.attendance_norm(72, 676) == pytest.approx(0.467, abs=2e-3)
    assert T.attendance_norm(0, 100) == 1.0


HOUSE_XML = """<rollcall-vote><vote-metadata><rollcall-num>12</rollcall-num></vote-metadata><vote-data>
<recorded-vote><legislator name-id="W000809" party="R" state="AR" role="legislator">Womack</legislator><vote>Yea</vote></recorded-vote>
<recorded-vote><legislator name-id="C001087" party="R" state="AR" role="legislator">Crawford</legislator><vote>Not Voting</vote></recorded-vote>
<recorded-vote><legislator name-id="H001072" party="R" state="AR" role="legislator">Hill (AR)</legislator><vote>Present</vote></recorded-vote>
</vote-data></rollcall-vote>"""


def test_house_roll_parse_and_tally():
    roll = S.parse_house_roll(HOUSE_XML)
    assert roll == {"W000809": "cast", "C001087": "missed", "H001072": "cast"}
    t = S.tally([roll, roll])
    assert t["C001087"] == {"cast": 0, "missed": 2, "total": 2}


SENATE_XML = """<roll_call_vote><members>
<member><last_name>Boozman</last_name><lis_member_id>S343</lis_member_id><vote_cast>Yea</vote_cast></member>
<member><last_name>Cotton</last_name><lis_member_id>S379</lis_member_id><vote_cast>Not Voting</vote_cast></member>
</members></roll_call_vote>"""


def test_incremental_tally():
    y = {}
    S.add_roll(y, S.parse_house_roll(HOUSE_XML))
    S.add_roll(y, S.parse_house_roll(HOUSE_XML))
    assert y["W000809"] == {"cast": 2, "missed": 0, "total": 2}


def test_senate_roll_parse():
    assert S.parse_senate_roll(SENATE_XML, {"S343": "B001236", "S379": "C001095"}) == {"B001236": "cast", "C001095": "missed"}


def test_bipartisan_share():
    share, n = T.bipartisan_share("R", [["R", "D"], ["R"], [], ["I"]])
    assert (share, n) == (0.5, 4)


def test_claimreview_filters_claimant():
    payload = {"claims": [{"text": "x", "claimant": "Vivek Ramaswamy", "claimReview": [{"publisher": {"name": "PolitiFact"}, "textualRating": "False"}]},
                          {"text": "y", "claimant": "Someone Else", "claimReview": [{"publisher": {"name": "AFP"}, "textualRating": "True"}]}]}
    out = S.parse_claimreviews(payload, "Vivek Ramaswamy")
    assert [r["rating"] for r in out] == ["False"]


def test_merge_never_overwrites_verified_with_empty_or_silently():
    old = {"value": 1.03, "verified": True}
    assert merge_safe(old, {"value": None}) == old
    m = merge_safe(old, {"value": 1.2, "verified": True})
    assert m["value"] == 1.03 and m["pending_update"]["value"] == 1.2
    assert merge_safe({"value": 1, "verified": False}, {"value": 2})["value"] == 2


def test_no_party_input_in_scoring_formulas():
    # Symmetry guard: none of the scoring transforms accept a party argument except the
    # bipartisanship counter, which only compares parties to each other.
    import inspect
    for name, fn in inspect.getmembers(T, inspect.isfunction):
        params = inspect.signature(fn).parameters
        if name != "bipartisan_share":
            assert not any("party" in p for p in params), name
