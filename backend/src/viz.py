"""Project high-dimensional embedding vectors down to 2D for visualization."""

import numpy as np
from sklearn.decomposition import PCA


def project_2d(vectors: list[list[float]]) -> list[tuple[float, float]]:
    """
    Reduce embedding vectors to 2D points via PCA, purely for plotting.

    Not used anywhere in the retrieval logic itself (that still runs on the
    full-dimensional vectors) - this is only so a human can *see* how chunks
    relate to each other spatially.
    """
    arr = np.array(vectors)
    if arr.shape[0] < 2:
        return [(0.0, 0.0)] * arr.shape[0]

    n_components = min(2, arr.shape[0], arr.shape[1])
    reduced = PCA(n_components=n_components).fit_transform(arr)
    if reduced.shape[1] == 1:
        reduced = np.hstack([reduced, np.zeros((reduced.shape[0], 1))])
    return [(float(x), float(y)) for x, y in reduced]
