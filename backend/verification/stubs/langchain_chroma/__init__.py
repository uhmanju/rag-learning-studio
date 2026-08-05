import math


def _overlap_distance(a_vec, b_vec):
    # Simple Euclidean distance on the stub's fake vectors — real enough to
    # produce varied, deterministic scores for testing serialize_run().
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a_vec, b_vec)))


class Chroma:
    def __init__(self, documents, embedding, collection_name, persist_directory=None):
        self.embedding = embedding
        self.collection_name = collection_name
        self.persist_directory = persist_directory
        self.documents = documents
        self.vectors = embedding.embed_documents([d.page_content for d in documents])

    @classmethod
    def from_documents(cls, documents, embedding, collection_name, persist_directory=None):
        return cls(documents, embedding, collection_name, persist_directory)

    def similarity_search_with_score(self, query, k=5):
        q_vec = self.embedding.embed_documents([query])[0]
        scored = [
            (doc, _overlap_distance(q_vec, vec))
            for doc, vec in zip(self.documents, self.vectors)
        ]
        scored.sort(key=lambda pair: pair[1])
        return scored[:k]
