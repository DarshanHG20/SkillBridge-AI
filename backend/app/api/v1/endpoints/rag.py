"""RAG document ingestion, index synchronization, and grounded retrieval endpoints."""

import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.models.rag_document import Document
from app.schemas.rag import (
    DocumentResponse,
    DocumentDetailResponse,
    DocumentUploadResponse,
    RAGQueryRequest,
    RAGQueryResponse,
)
from app.rag.service import RAGService
from app.core.config import get_settings


logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/documents/upload", response_model=DocumentUploadResponse, summary="Upload and index educational document")
async def upload_document(
    file: UploadFile = File(...),
    title: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Safely validate, extract text from PDF/TXT/MD, chunk, and index into persistent vector store."""
    settings = get_settings()

    content_bytes = await file.read()
    if len(content_bytes) > settings.RAG_MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum allowed size of {settings.RAG_MAX_FILE_SIZE_BYTES // (1024 * 1024)}MB.",
        )

    doc_title = title if title and title.strip() else file.filename
    # Admin or authorized student uploads
    is_approved = True

    try:
        doc = RAGService.upload_and_index_document(
            db=db,
            user_id=current_user.id,
            title=doc_title,
            filename=file.filename or "uploaded_document",
            content_bytes=content_bytes,
            is_approved=is_approved,
        )
    except HTTPException:
        raise
    except ValueError as val_err:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(val_err))
    except Exception as exc:
        logger.error("Failed to process uploaded document: %s", exc, exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Document processing failed: {exc}")

    return DocumentUploadResponse(
        document_id=doc.id,
        title=doc.title,
        filename=doc.filename,
        file_size_bytes=doc.file_size_bytes,
        chunk_count=doc.chunk_count,
        message="Document successfully uploaded, processed, and added to the educational index.",
    )


@router.get("/documents", response_model=List[DocumentResponse], summary="List approved educational documents")
def list_documents(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retrieve catalog of approved educational reference documents."""
    return db.query(Document).filter(Document.is_approved.is_(True)).order_by(Document.id.desc()).all()


@router.get("/documents/{document_id}", response_model=DocumentDetailResponse, summary="Get document details and chunks")
def get_document_detail(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Fetch document metadata along with constituent indexed chunks."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Document #{document_id} not found.")
    return doc


@router.delete("/documents/{document_id}", summary="Delete document and remove from index")
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Delete document and update vector index (enforces uploader or administrator authorization)."""
    RAGService.delete_document(db=db, document_id=document_id, current_user=current_user)
    return {"message": f"Document #{document_id} and its associated index entries have been deleted."}


@router.post("/query", response_model=RAGQueryResponse, summary="Query educational documents via grounded RAG")
def query_rag(
    payload: RAGQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Perform vector retrieval and synthesize grounded pedagogical answer with verified citations."""
    result = RAGService.generate_grounded_answer(
        db=db,
        user_query=payload.query,
        user_id=current_user.id,
    )

    return RAGQueryResponse(
        query=payload.query,
        answer=result["answer"],
        evidence_sufficient=result.get("evidence_sufficient", True),
        is_fallback=result.get("is_fallback", False),
        provider=result.get("provider"),
        model=result.get("model"),
        sources=result.get("sources", []),
    )


@router.post("/rebuild-index", summary="Rebuild entire persistent vector index")
def rebuild_vector_index(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Rebuild TF-IDF vector index over all approved educational chunks in the database."""
    if current_user.role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator privileges required.")

    RAGService.rebuild_index(db)
    return {"message": "Vector index successfully rebuilt from active database chunks."}
