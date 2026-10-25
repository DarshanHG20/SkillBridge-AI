"""Chat endpoints managing learning conversations, pedagogical assistance, and privacy."""

import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.schemas.chat import (
    ConversationCreateRequest,
    ConversationResponse,
    ConversationDetailResponse,
    MessageCreateRequest,
    MessageResponse,
)
from app.chat.service import ChatService


logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/conversations", response_model=ConversationResponse, summary="Create new tutoring conversation")
def create_conversation(
    payload: ConversationCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Initiate a private tutoring thread scoped strictly to the current user."""
    return ChatService.create_conversation(
        db=db,
        user_id=current_user.id,
        title=payload.title,
        topic=payload.topic or "general",
    )


@router.get("/conversations", response_model=List[ConversationResponse], summary="List user's tutoring conversations")
def list_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Retrieve all conversations belonging to the authenticated learner."""
    return ChatService.list_conversations(db=db, user_id=current_user.id)


@router.get("/conversations/{conversation_id}", response_model=ConversationDetailResponse, summary="Get conversation history")
def get_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Fetch complete message history for a conversation with strict ownership verification."""
    return ChatService.get_conversation_with_messages(
        db=db,
        conversation_id=conversation_id,
        user_id=current_user.id,
    )


@router.post("/conversations/{conversation_id}/messages", response_model=MessageResponse, summary="Send message to AI Tutor")
def send_message(
    conversation_id: int,
    payload: MessageCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Post learner message and receive pedagogically grounded AI tutor reply with source citations."""
    return ChatService.send_message(
        db=db,
        conversation_id=conversation_id,
        user_id=current_user.id,
        message_text=payload.content,
        use_rag=payload.use_rag,
    )


@router.delete("/conversations/{conversation_id}", summary="Delete tutoring conversation")
def delete_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """Permanently delete conversation history for privacy compliance."""
    ChatService.delete_conversation(
        db=db,
        conversation_id=conversation_id,
        user_id=current_user.id,
    )
    return {"message": f"Conversation #{conversation_id} deleted successfully."}
