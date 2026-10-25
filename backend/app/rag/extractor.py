"""Safe document text extraction and file validation."""

import hashlib
import io
from typing import List, Tuple
from fastapi import HTTPException, status
from pypdf import PdfReader

from app.core.config import get_settings


ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md"}


class DocumentExtractor:
    """Validator and text extractor for educational document files."""

    @staticmethod
    def validate_file(filename: str, content_bytes: bytes) -> str:
        """Validate file extension and size constraints. Returns sanitized extension."""
        settings = get_settings()

        # 1. Size check
        if len(content_bytes) > settings.RAG_MAX_FILE_SIZE_BYTES:
            max_mb = settings.RAG_MAX_FILE_SIZE_BYTES // (1024 * 1024)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File exceeds maximum allowed size of {max_mb} MB.",
            )

        if len(content_bytes) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty.",
            )

        # 2. Extension check
        dot_idx = filename.rfind(".")
        if dot_idx == -1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must possess a valid extension (.pdf, .txt, .md).",
            )

        ext = filename[dot_idx:].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type '{ext}'. Allowed extensions: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
            )

        return ext[1:]  # e.g. 'pdf', 'txt', 'md'

    @staticmethod
    def compute_hash(content_bytes: bytes) -> str:
        """Calculate SHA-256 fingerprint for deduplication."""
        return hashlib.sha256(content_bytes).hexdigest()

    @staticmethod
    def extract_text_pages(content_bytes: bytes, file_type: str) -> List[Tuple[int, str]]:
        """Extract text content mapped to page numbers (page_number: int, text: str)."""
        pages: List[Tuple[int, str]] = []

        if file_type == "pdf":
            try:
                reader = PdfReader(io.BytesIO(content_bytes))
                if reader.is_encrypted:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Encrypted or password-protected PDFs are not supported.",
                    )

                for page_idx, page in enumerate(reader.pages):
                    extracted = page.extract_text() or ""
                    cleaned = extracted.strip()
                    if cleaned:
                        pages.append((page_idx + 1, cleaned))
            except HTTPException:
                raise
            except Exception as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to parse PDF document: {exc}",
                )
        else:  # 'txt' or 'md'
            try:
                text = content_bytes.decode("utf-8", errors="replace").strip()
                if text:
                    pages.append((1, text))
            except Exception as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Failed to decode text file: {exc}",
                )

        if not pages:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No readable text could be extracted from this document.",
            )

        return pages
