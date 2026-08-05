import math


class HuggingFaceEmbeddings:
    def __init__(self, model_name=""):
        self.model_name = model_name
        self.dims = 16

    def _vec(self, text):
        seed = sum(ord(c) for c in text) or 1
        raw = [math.sin(seed * (i + 1)) for i in range(self.dims)]
        norm = math.sqrt(sum(v * v for v in raw)) or 1.0
        return [v / norm for v in raw]  # normalized, like real MiniLM output

    def embed_documents(self, texts):
        return [self._vec(t) for t in texts]
