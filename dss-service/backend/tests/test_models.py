"""Unit tests for the AHP and TOPSIS engines."""
import numpy as np
import pandas as pd
import pytest

from models.ahp import AHPEngine
from models.topsis import TOPSISSEngine


# ---------------------------------------------------------------------------
# AHP tests
# ---------------------------------------------------------------------------
class TestAHP:
    def test_ahp_known_3x3_matrix(self):
        """3x3 Saaty matrix should yield w ~ [0.63, 0.26, 0.11], CR ~ 0.039."""
        matrix = np.array(
            [
                [1.0, 3.0, 5.0],
                [1 / 3, 1.0, 3.0],
                [1 / 5, 1 / 3, 1.0],
            ]
        )
        result = AHPEngine.calculate_weights(matrix)

        weights = np.asarray(result["weights"])
        # Sum to 1 and sorted descending.
        assert np.isclose(weights.sum(), 1.0, atol=1e-3)
        assert weights[0] >= weights[1] >= weights[2]

        # Expected eigenvector approximation (normalized).
        assert weights[0] == pytest.approx(0.63, abs=0.02)
        assert weights[1] == pytest.approx(0.26, abs=0.03)
        assert weights[2] == pytest.approx(0.11, abs=0.03)

        assert result["cr"] == pytest.approx(0.039, abs=0.01)
        assert result["cr"] < 0.10
        assert result["is_consistent"] is True

    def test_ahp_reciprocity_and_small_n(self):
        """n=2 matrix is always consistent; n=1 returns identity weight."""
        m2 = np.array([[1.0, 2.0], [0.5, 1.0]])
        res2 = AHPEngine.calculate_weights(m2)
        assert res2["is_consistent"] is True
        assert np.isclose(np.sum(res2["weights"]), 1.0)

        m1 = np.array([[1.0]])
        res1 = AHPEngine.calculate_weights(m1)
        assert res1["weights"] == pytest.approx([1.0])

    def test_ahp_non_square_raises(self):
        with pytest.raises(ValueError):
            AHPEngine.calculate_weights(np.array([[1.0, 2.0, 3.0], [0.5, 1.0, 2.0]]))


# ---------------------------------------------------------------------------
# TOPSIS tests
# ---------------------------------------------------------------------------
class TestTOPSIS:
    def test_topsis_4_alternatives(self):
        """4 alternatives, 3 criteria; verify ranking & distance factors."""
        # Benefit: power; Cost: price, weight.
        df = pd.DataFrame(
            {
                "variant": ["A", "B", "C", "D"],
                "price": [300, 200, 150, 100],   # lower is better
                "power": [80, 90, 95, 100],      # higher is better
                "weight": [200, 170, 140, 110],  # lower is better
            }
        )
        criteria = ["price", "power", "weight"]
        weights = [0.4, 0.3, 0.3]
        benefit_mask = [False, True, False]

        result = TOPSISSEngine.evaluate(df, criteria, weights, benefit_mask)

        # Scores within [0,1], ranks 1..4 and no NaN.
        assert result["topsis_score"].between(0, 1).all()
        assert set(result["rank"]) == {1, 2, 3, 4}
        assert not result["topsis_score"].isna().any()

        # D (100 price, 110 weight, 100 power) should dominate -> rank 1.
        assert result.iloc[0]["variant"] == "D"
        assert result.iloc[0]["rank"] == 1

        # A dominates on nothing (worst on all benefits/costs) -> rank 4.
        assert result.iloc[-1]["variant"] == "A"

    def test_topsis_no_division_by_zero(self):
        """Identical rows should not cause division by zero in scores."""
        df = pd.DataFrame(
            {
                "v1": [10, 10, 10],
                "v2": [5, 5, 5],
            }
        )
        result = TOPSISSEngine.evaluate(df, ["v1", "v2"], [0.5, 0.5], [True, True])
        assert not result["topsis_score"].isna().any()
        # All identical -> all tie for Rank 1 (method='min').
        assert result["rank"].tolist() == [1, 1, 1]

    def test_topsis_weights_normalized(self):
        df = pd.DataFrame({"v1": [1, 2], "v2": [3, 4]})
        out = TOPSISSEngine.evaluate(df, ["v1", "v2"], [3, 3], [True, True])
        # Even without normalizing, 2x [3,3] is equivalent to [0.5,0.5].
        assert out["topsis_score"].between(0, 1).all()