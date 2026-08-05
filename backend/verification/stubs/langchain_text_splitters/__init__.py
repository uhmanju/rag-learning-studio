from langchain_core.documents import Document


class RecursiveCharacterTextSplitter:
    def __init__(self, chunk_size=500, chunk_overlap=100):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def split_documents(self, documents):
        out = []
        for doc in documents:
            text = doc.page_content
            step = max(1, self.chunk_size - self.chunk_overlap)
            start = 0
            if not text:
                continue
            while start < len(text):
                piece = text[start : start + self.chunk_size]
                if piece.strip():
                    out.append(Document(page_content=piece, metadata=dict(doc.metadata)))
                start += step
        return out
