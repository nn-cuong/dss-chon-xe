"""AHP (Analytic Hierarchy Process) engine.

Computes a priority (weight) vector from a pairwise comparison matrix and
checks consistency via the Saaty consistency ratio (CR < 0.10).
"""
from typing import Dict, Any

import numpy as np


class AHPEngine:
    """AHP engine implementing the Saaty eigenvector method.

    The weights therefore reflect the relative importance of each criterion
    derived from a user's pairwise comparisons.
    """

    # Saaty random index table (order n -> RI)
    RI_DICT: Dict[int, float] = {
        1: 0.0, 2: 0.0, 3: 0.52, 4: 0.89, 5: 1.11,
        6: 1.25, 7: 1.35, 8: 1.40, 9: 1.45, 10: 1.49,
    }

    CONSISTENCY_THRESHOLD = 0.1

    @staticmethod
    def calculate_weights(pairwise_matrix: np.ndarray) -> Dict[str, Any]:
        """Compute AHP weights and consistency metrics.

        Args:
            pairwise_matrix: square n x n pairwise comparison matrix.

        Returns:
            dict with keys: weights, lambda_max, ci, cr, is_consistent.
        """
        pairwise_matrix = np.asarray(pairwise_matrix, dtype=float)
        n = pairwise_matrix.shape[0]

        if n != pairwise_matrix.shape[1]:
            raise ValueError("Pairwise matrix must be square.")

        # 1. Normalize the matrix by column sums.
        col_sums = pairwise_matrix.sum(axis=0)
        if np.any(col_sums == 0):
            raise ValueError("Pairwise matrix column sums must be non-zero.")
        norm_matrix = pairwise_matrix / col_sums

        # 2. Priority vector (mean of each normalized row).
        weights = norm_matrix.mean(axis=1)

        # For n <= 2 the geometric consistency is trivial.
        if n <= 2:
            weights = weights / weights.sum() if weights.sum() > 0 else weights
            return {
                "weights": weights.tolist(),
                "lambda_max": float(n),
                "ci": 0.0,
                "cr": 0.0,
                "is_consistent": True,
            }

        # 3. Consistency calculation.
        ax = np.dot(pairwise_matrix, weights)
        with np.errstate(divide="ignore", invalid="ignore"):
            consistency_vector = np.divide(ax, weights, out=np.zeros_like(ax), where=weights != 0)
        lambda_max = float(np.mean(consistency_vector))
        ci = (lambda_max - n) / (n - 1)
        ri = AHPEngine.RI_DICT.get(n, 1.49)
        cr = ci / ri if ri > 0 else 0.0

        # Normalize weights to sum to 1.
        if weights.sum() > 0:
            weights = weights / weights.sum()

        return {
            "weights": weights.tolist(),
            "lambda_max": round(lambda_max, 6),
            "ci": round(ci, 6),
            "cr": round(cr, 6),
            "is_consistent": cr < AHPEngine.CONSISTENCY_THRESHOLD,
        }


def build_reciprocal_matrix(comparisons: Dict[str, Dict[str, float]]) -> np.ndarray:
    """Build a reciprocal pairwise matrix from a dictionary of comparisons.

    `comparisons` maps criterion labels to their relative importance, e.g.::

        {
            "price": {"price": 1.0, "power": 3.0},
            "power": {"price": 1 / 3, "power": 1.0},
        }

    The off-diagonal entry is automatically the reciprocal.
    """
    labels = list(comparisons.keys())
    n = len(labels)
    matrix = np.ones((n, n), dtype=float)
    for i, li in enumerate(labels):
        for j, lj in enumerate(labels):
            if i == j:
                matrix[i][j] = 1.0
            elif lj in comparisons[li]:
                matrix[i][j] = comparisons[li][lj]
            elif li in comparisons[lj]:
                matrix[i][j] = 1.0 / comparisons[lj][li]
    return matrix