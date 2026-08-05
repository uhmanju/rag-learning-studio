import asyncio
import sys
from pathlib import Path
from unittest.mock import patch

STUBS = str(Path(__file__).parent / "stubs")
BACKEND = str(Path(__file__).parent.parent)  # backend/verification/ -> backend/
sys.path.insert(0, STUBS)
sys.path.insert(0, BACKEND)

import api  # noqa: E402
from fastapi import UploadFile  # noqa: E402


def run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


def check(label, cond):
    status = "OK  " if cond else "FAIL"
    print(f"{status} {label}")
    if not cond:
        raise SystemExit(1)


upload_file = UploadFile(filename="sample.pdf", content=b"fake")
result = run(api.upload_document(upload_file))
run_id = result["run"]["id"]

print("=== simulating Ollama being down during generation ===")
with patch("api.get_llm", side_effect=RuntimeError("Could not connect to Ollama at localhost:11434")):
    result = run(api.ask_question(run_id, {"question": "What experience does this candidate have with PhonePe?"}))

r = result["run"]
check("retrieve still succeeded with real data", r["stages"]["retrieve"]["status"] == "done")
check("prompt still built with real context", r["stages"]["prompt"]["status"] == "done")
check("generate reports error, not a crash", r["stages"]["generate"]["status"] == "error")
check("generate error reason is the real exception message", "Ollama" in r["stages"]["generate"]["reason"])
check("generate error includes a suggested next step", bool(r["stages"]["generate"].get("suggestedNextStep")))
check("evaluate stays pending (nothing to evaluate without an answer)", r["stages"]["evaluate"]["status"] == "pending")

print("\nALL LLM-FAILURE CHECKS PASSED")
