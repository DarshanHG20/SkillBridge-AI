"""Text chunking logic with positional metadata and boundary preservation."""

from typing import List, Tuple
from pydantic import BaseModel


class TextChunk(BaseModel):
    """Normalized chunk item ready for persistent DB storage and vector indexing."""
    chunk_index: int
    page_number: int
    char_start: int
    char_end: int
    text_content: str


class DocumentChunker:
    """Partitions document page texts into overlapping semantic windows."""

    @staticmethod
    def chunk_document_pages(
        pages: List[Tuple[int, str]],
        chunk_size: int = 500,
        chunk_overlap: int = 100,
    ) -> List[TextChunk]:
        """Chunk page text with overlapping character windows and positional metadata."""
        chunks: List[TextChunk] = []
        global_chunk_idx = 0

        for page_num, page_text in pages:
            text_len = len(page_text)
            start = 0

            while start < text_len:
                end = min(start + chunk_size, text_len)

                # Attempt to break on word or punctuation boundary if not at end of text
                if end < text_len:
                    last_space = page_text.rfind(" ", start, end)
                    if last_space > start + (chunk_size // 2):
                        end = last_space

                chunk_str = page_text[start:end].strip()
                if chunk_str:
                    chunks.append(
                        TextChunk(
                            chunk_index=global_chunk_idx,
                            page_number=page_num,
                            char_start=start,
                            char_end=end,
                            text_content=chunk_str,
                        )
                    )
                    global_chunk_idx += 1

                if end >= text_len:
                    break

                # Advance start with overlap
                start = end - chunk_overlap
                if start <= 0 or start >= end:
                    start = end

        return chunks
