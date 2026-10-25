"""Pydantic schemas for RAG documents, indexing, retrieval, and source citations."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class SourceCitationSchema(BaseModel):
    """Accredited source reference returned alongside generated responses."""
    document_id: int
    document_title: str
    page_number: Optional[int] = None
    snippet: str
    relevance_score: float


class DocumentChunkResponse(BaseModel):
    """Metadata and content for an indexed document chunk."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    chunk_index: int
    char_start: int
    char_end: int
    page_number: Optional[int] = None
    text_content: str


class DocumentResponse(BaseModel):
    """Metadata for an approved educational document in the library."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: Optional[int] = None
    title: str
    filename: str
    file_type: str
    file_size_bytes: int
    is_approved: bool
    chunk_count: int
    created_at: datetime


class DocumentDetailResponse(DocumentResponse):
    """Detailed document with associated chunks."""
    chunks: List[DocumentChunkResponse] = []


class DocumentUploadResponse(BaseModel):
    """Response returned upon successful upload, extraction, and indexing."""
    document_id: int
    title: str
    filename: str
    file_size_bytes: int
    chunk_count: int
    message: str


class RAGQueryRequest(BaseModel):
    """Request for grounded retrieval over educational documents."""
    query: str = Field(..., min_length=2, max_length=1000)
    top_k: int = Field(default=3, ge=1, le=10)


class RAGQueryResponse(BaseModel):
    """Grounded answer accompanied by verified citations or insufficient evidence status."""
    query: str
    answer: str
    evidence_sufficient: bool
    is_fallback: bool
    provider: Optional[str] = None
    model: Optional[str] = None
    sources: List[SourceCitationSchema] = []
