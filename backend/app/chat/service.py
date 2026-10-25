"""Pedagogical Chat Service with privacy controls, RAG grounding, and conversation history."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.chat import ChatConversation, ChatMessage
from app.ai.adapter import LLMAdapter
from app.ai.base import LLMMessage
from app.rag.service import RAGService


PEDAGOGICAL_SYSTEM_PROMPT = (
    "You are the SkillBridge AI Learning Tutor. Your mission is to empower students through active learning:\n"
    "- Provide clear, concise explanations of technical concepts across programming, data, and systems.\n"
    "- When students ask for help with assessments or coding problems, offer progressive conceptual hints "
    "and debugging questions rather than giving away direct final answers.\n"
    "- Help learners understand career gap reports and formulate achievable study milestones.\n"
    "- Maintain an encouraging, patient, and academically rigorous tone.\n"
    "- Never reveal another student's account details, private data, or internal system credentials."
)


class ChatService:
    """Service managing chat threads, pedagogical responses, and privacy isolation."""

    @staticmethod
    def create_conversation(
        db: Session,
        user_id: int,
        title: Optional[str] = None,
        topic: str = "general",
    ) -> ChatConversation:
        """Create a new authenticated tutoring conversation thread."""
        conv = ChatConversation(
            user_id=user_id,
            title=title.strip() if title and title.strip() else "New Tutoring Session",
            topic=topic,
        )
        db.add(conv)
        db.commit()
        db.refresh(conv)
        return conv

    @staticmethod
    def list_conversations(db: Session, user_id: int) -> List[ChatConversation]:
        """List active conversation threads strictly owned by the caller."""
        return (
            db.query(ChatConversation)
            .filter(ChatConversation.user_id == user_id)
            .order_by(ChatConversation.updated_at.desc())
            .all()
        )

    @staticmethod
    def get_conversation_with_messages(
        db: Session,
        conversation_id: int,
        user_id: int,
    ) -> ChatConversation:
        """Retrieve conversation thread with message history, enforcing ownership privacy checks."""
        conv = db.query(ChatConversation).filter(ChatConversation.id == conversation_id).first()
        if not conv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Conversation {conversation_id} not found.",
            )

        if conv.user_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: You do not have permission to access another student's conversation.",
            )

        return conv

    @staticmethod
    def send_message(
        db: Session,
        conversation_id: int,
        user_id: int,
        message_text: str,
        use_rag: bool = False,
    ) -> ChatMessage:
        """Process a user message, query RAG or LLM tutor, and append assistant reply."""
        conv = ChatService.get_conversation_with_messages(db, conversation_id, user_id)

        clean_text = message_text.strip()
        if not clean_text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Message text cannot be empty.",
            )

        # 1. Record user message
        user_msg = ChatMessage(
            conversation_id=conv.id,
            sender="user",
            message_text=clean_text,
            is_fallback=False,
        )
        db.add(user_msg)
        db.flush()

        # 2. Synthesize Tutor response
        sources: List[Dict[str, Any]] = []
        is_fallback = False
        reply_text = ""

        if use_rag:
            rag_result = RAGService.generate_grounded_answer(
                db=db,
                user_query=clean_text,
                user_id=user_id,
            )
            reply_text = rag_result["answer"]
            sources = rag_result.get("sources", [])
            is_fallback = rag_result.get("is_fallback", False)
        else:
            # Multi-turn conversational context (last 6 messages)
            recent_msgs = (
                db.query(ChatMessage)
                .filter(ChatMessage.conversation_id == conv.id)
                .order_by(ChatMessage.created_at.desc())
                .limit(6)
                .all()
            )
            recent_msgs.reverse()

            llm_messages: List[LLMMessage] = []
            for m in recent_msgs:
                role = "assistant" if m.sender == "assistant" else "user"
                llm_messages.append(LLMMessage(role=role, content=m.message_text))

            llm_response = LLMAdapter.complete_chat(
                messages=llm_messages,
                system_prompt=PEDAGOGICAL_SYSTEM_PROMPT,
                user_id=user_id,
            )
            reply_text = llm_response.content
            is_fallback = llm_response.is_fallback

        # 3. Record assistant message
        assistant_msg = ChatMessage(
            conversation_id=conv.id,
            sender="assistant",
            message_text=reply_text,
            sources_json=sources if sources else None,
            is_fallback=is_fallback,
        )
        db.add(assistant_msg)

        # Update conversation timestamp & auto-title if initial
        conv.updated_at = datetime.utcnow()
        if conv.title == "New Tutoring Session" and len(clean_text) > 0:
            conv.title = clean_text[:40] + ("..." if len(clean_text) > 40 else "")

        db.commit()
        db.refresh(assistant_msg)
        return assistant_msg

    @staticmethod
    def delete_conversation(
        db: Session,
        conversation_id: int,
        user_id: int,
    ) -> bool:
        """Purge an individual conversation thread and its messages."""
        conv = ChatService.get_conversation_with_messages(db, conversation_id, user_id)
        db.delete(conv)
        db.commit()
        return True
