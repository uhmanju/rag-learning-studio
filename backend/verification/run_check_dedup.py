import asyncio
import sys
from pathlib import Path

STUBS = str(Path(__file__).parent / "stubs")
BACKEND = str(Path(__file__).parent.parent)
sys.path.insert(0, STUBS)
sys.path.insert(0, BACKEND)

from langchain_core.documents import Document  # noqa: E402
from src.trace import add_query_to_trace, build_ingestion_trace  # noqa: E402


def check(label, cond):
    print(("OK  " if cond else "FAIL"), label)
    if not cond:
        raise SystemExit(1)


# Directly exercise the dedup unit, independent of the rest of the pipeline,
# with a deliberately duplicated chunk (as overlapping chunk boundaries can
# produce in practice).
from src.trace import _dedupe_candidates  # noqa: E402

dupe_text = "PhonePe Consumer app is a fintech platform used for UPI Payments."
results = [
    (Document(page_content=dupe_text, metadata={"page": 3}), 0.40),
    (Document(page_content="Unrelated content about GoodYear tires.", metadata={"page": 7}), 0.90),
    (Document(page_content=dupe_text, metadata={"page": 3}), 0.55),  # same text, worse score - should be dropped
]

deduped = _dedupe_candidates(results)
check("3 raw results in", len(results) == 3)
check("2 unique results out", len(deduped) == 2)
check("kept the BETTER-scoring occurrence of the duplicate", deduped[0][1] == 0.40)
check("order preserved for the non-duplicate", deduped[1][0].page_content.startswith("Unrelated"))

print("\nALL DEDUP CHECKS PASSED")
