import asyncio
import json
import sys
from pathlib import Path

STUBS = str(Path(__file__).parent / "stubs")
BACKEND = str(Path(__file__).parent.parent)  # backend/verification/ -> backend/
sys.path.insert(0, STUBS)
sys.path.insert(0, BACKEND)

import api  # noqa: E402
from fastapi import UploadFile  # noqa: E402 (the stub)


def run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


def check(label, cond):
    status = "OK  " if cond else "FAIL"
    print(f"{status} {label}")
    if not cond:
        raise SystemExit(1)


print("=== upload_document ===")
upload_file = UploadFile(filename="sample.pdf", content=b"%PDF-fake-bytes-not-really-read%")
result = run(api.upload_document(upload_file))
r = result["run"]
check("has 8-key-ish stages dict", set(r["stages"].keys()) == {"parse", "clean", "chunk", "embed", "retrieve", "prompt", "generate", "evaluate"})
check("parse done", r["stages"]["parse"]["status"] == "done")
check("parse has 5 pages", len(r["stages"]["parse"]["data"]) == 5)
check("page 5 flagged low confidence", r["stages"]["parse"]["data"][4]["extractionConfidence"] < 0.5)
check("clean done", r["stages"]["clean"]["status"] == "done")
check("chunk done with chunks", len(r["stages"]["chunk"]["data"]["chunks"]) > 0)
check("chunk parameters echoed", r["stages"]["chunk"]["data"]["parameters"]["chunkSize"] == 500)
check("embed done, has projection", len(r["stages"]["embed"]["data"]["projection"]) == len(r["stages"]["chunk"]["data"]["chunks"]))
check("embed model dims sane", r["stages"]["embed"]["data"]["model"]["dimensions"] > 0)
check("retrieve pending pre-question", r["stages"]["retrieve"]["status"] == "pending")
check("generate pending pre-question", r["stages"]["generate"]["status"] == "pending")
run_id = r["id"]

print(json.dumps({k: r["stages"][k]["status"] for k in r["stages"]}, indent=2))

print("=== ask_question (should succeed - PhonePe is real content) ===")
result = run(api.ask_question(run_id, {"question": "What experience does this candidate have with PhonePe?"}))
r = result["run"]
check("retrieve done", r["stages"]["retrieve"]["status"] == "done")
check("some candidates kept", any(c["kept"] for c in r["stages"]["retrieve"]["data"]["candidates"]))
check("prompt done", r["stages"]["prompt"]["status"] == "done")
check("prompt has system+context+question sections", {"system", "question"} <= {s["kind"] for s in r["stages"]["prompt"]["data"]["sections"]})
check("generate done", r["stages"]["generate"]["status"] == "done")
check("generate not abstained", r["stages"]["generate"]["data"]["abstained"] is False)
check("citations reference real chunk ids", all(c["chunkId"].startswith("chunk-") for c in r["stages"]["generate"]["data"]["citations"]))
check("evaluate done", r["stages"]["evaluate"]["status"] == "done")
check("evaluate has latency breakdown", len(r["stages"]["evaluate"]["data"]["latencyBreakdown"]) >= 5)
print("Answer:", r["stages"]["generate"]["data"]["answer"][:80], "...")

print("=== ask_question with an impossible threshold (should abstain) ===")
result = run(api.ask_question(run_id, {"question": "What experience does this candidate have with PhonePe?", "threshold": 0.0001}))
r = result["run"]
check("retrieve failed (nothing kept)", r["stages"]["retrieve"]["status"] == "failed")
check("retrieve has reason", bool(r["stages"]["retrieve"].get("reason")))
check("generate done and abstained", r["stages"]["generate"]["status"] == "done" and r["stages"]["generate"]["data"]["abstained"] is True)
check("prompt still built (context empty)", r["stages"]["prompt"]["status"] == "done")

print("=== rebuild_chunks with a different chunk size (should re-run the standing question) ===")
result = run(api.rebuild_chunks(run_id, {"chunkSize": 200, "chunkOverlap": 40}))
r = result["run"]
check("chunk params updated", r["stages"]["chunk"]["data"]["parameters"]["chunkSize"] == 200)
check("question was preserved and re-answered", r["stages"]["generate"]["status"] == "done")

print("=== rebuild_retrieval with a looser threshold (back to keeping candidates) ===")
result = run(api.rebuild_retrieval(run_id, {"topK": 5, "threshold": 3.0}))
r = result["run"]
check("retrieve done again", r["stages"]["retrieve"]["status"] == "done")

print("=== get_run / list_documents ===")
result = run(api.get_run(run_id))
check("get_run returns same id", result["run"]["id"] == run_id)
result = run(api.list_documents())
check("list_documents includes our run", run_id in result["documentIds"])

print("\nALL CHECKS PASSED")
