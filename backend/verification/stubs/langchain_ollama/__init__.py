import re


class _Response:
    def __init__(self, content):
        self.content = content


class ChatOllama:
    def __init__(self, model="", temperature=0.0):
        self.model = model
        self.temperature = temperature

    def invoke(self, prompt_value):
        text = prompt_value.to_string() if hasattr(prompt_value, "to_string") else str(prompt_value)
        pages = sorted(set(re.findall(r"Page:\s*(\d+)", text) + re.findall(r"page['\"]?\s*[:=]\s*(\d+)", text)))
        if not pages:
            pages = sorted(set(re.findall(r"\bpage\s+(\d+)\b", text, re.IGNORECASE)))
        body = "This is a stubbed answer for offline verification, synthesized from the real assembled prompt."
        sources = "\n".join(f"- Page {p}" for p in pages) or "- Page 1"
        return _Response(f"Answer:\n{body}\n\nSources:\n{sources}")
