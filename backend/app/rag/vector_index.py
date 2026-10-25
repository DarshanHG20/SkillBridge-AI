"""Persistent zero-cost vector indexing and similarity search using TF-IDF + Cosine Distance.

Operational Architecture & Trade-Offs:
1. Zero Cost & Privacy: Operates entirely locally on-device/in-process without external API keys or recurring costs.
2. Determinism: Produces completely reproducible similarity rankings for test suites.
3. Performance: Sub-millisecond similarity scoring on commodity CPU hardware without GPU acceleration.
4. Persistence: Automatically serializes vocabulary and chunk document vectors to local joblib cache.
"""

import os
from typing import Dict, List, Optional, Tuple
import joblib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


RAG_DIR = os.path.dirname(os.path.abspath(__file__))
INDEX_DIR = os.path.join(RAG_DIR, "indices")
INDEX_PATH = os.path.join(INDEX_DIR, "vector_index.joblib")


class PersistentVectorIndex:
    """Zero-cost local vector index for educational document chunk retrieval."""

    def __init__(self, persistence_path: str = INDEX_PATH):
        self.persistence_path = persistence_path
        self.vectorizer: Optional[TfidfVectorizer] = None
        self.chunk_ids: List[int] = []
        self.chunk_texts: List[str] = []
        self.tfidf_matrix: Optional[np.ndarray] = None
        self._load()

    def _load(self) -> None:
        """Load persisted index from disk if present."""
        if os.path.exists(self.persistence_path):
            try:
                payload = joblib.load(self.persistence_path)
                self.vectorizer = payload.get("vectorizer")
                self.chunk_ids = payload.get("chunk_ids", [])
                self.chunk_texts = payload.get("chunk_texts", [])
                self.tfidf_matrix = payload.get("tfidf_matrix")
            except Exception:
                self.reset()

    def save(self) -> None:
        """Serialize current index state to disk."""
        os.makedirs(os.path.dirname(self.persistence_path), exist_ok=True)
        payload = {
            "vectorizer": self.vectorizer,
            "chunk_ids": self.chunk_ids,
            "chunk_texts": self.chunk_texts,
            "tfidf_matrix": self.tfidf_matrix,
        }
        joblib.dump(payload, self.persistence_path)

    def reset(self) -> None:
        """Clear the in-memory and on-disk index."""
        self.vectorizer = None
        self.chunk_ids = []
        self.chunk_texts = []
        self.tfidf_matrix = None
        if os.path.exists(self.persistence_path):
            try:
                os.remove(self.persistence_path)
            except OSError:
                pass

    def build_index(self, chunks: List[Tuple[int, str]]) -> None:
        """Build and persist vector index from a list of (chunk_id, text_content) pairs."""
        if not chunks:
            self.reset()
            return

        self.chunk_ids = [c[0] for c in chunks]
        self.chunk_texts = [c[1] for c in chunks]

        self.vectorizer = TfidfVectorizer(
            sublinear_tf=True,
            ngram_range=(1, 2),
            stop_words="english",
            max_features=5000,
        )
        self.tfidf_matrix = self.vectorizer.fit_transform(self.chunk_texts)
        self.save()

    def search(
        self,
        query: str,
        top_k: int = 3,
        min_similarity: float = 0.15,
    ) -> List[Tuple[int, float]]:
        """Query index and return list of (chunk_id, similarity_score) sorted by relevance descending."""
        if (
            self.vectorizer is None
            or self.tfidf_matrix is None
            or not self.chunk_ids
            or not query.strip()
        ):
            return []

        try:
            query_vec = self.vectorizer.transform([query])
            scores = cosine_similarity(query_vec, self.tfidf_matrix).flatten()

            results: List[Tuple[int, float]] = []
            for idx, score in enumerate(scores):
                if score >= min_similarity:
                    results.append((self.chunk_ids[idx], float(round(score, 4))))

            # Sort by similarity descending
            results.sort(key=lambda x: x[1], reverse=True)
            return results[:top_k]
        except Exception:
            return []
