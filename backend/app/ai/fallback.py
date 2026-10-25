"""Transparent deterministic fallback engine active when no LLM provider is configured."""

import re
from typing import List, Optional
from app.ai.base import BaseLLMClient, LLMMessage, LLMResponse


FALLBACK_NOTICE_HEADER = "[SkillBridge Deterministic Fallback Active - No LLM Provider Configured]\n\n"

# Domain knowledge base for deterministic tutoring
CONCEPT_KNOWLEDGE = {
    "python": (
        "In Python, variables are dynamically typed and memory is managed via reference counting and garbage collection. "
        "Key concepts include list comprehensions `[x for x in seq if cond]`, generators `yield`, "
        "and object-oriented principles with classes and dunder methods (`__init__`, `__repr__`)."
    ),
    "sql": (
        "SQL (Structured Query Language) manages relational databases. Use `INNER JOIN` for matching rows across tables, "
        "`LEFT JOIN` to preserve all records from the left table, and `GROUP BY` with `HAVING` to filter aggregated results. "
        "Proper indexing on frequently queried columns significantly accelerates execution."
    ),
    "dsa": (
        "Data Structures & Algorithms form computational foundations. Arrays offer O(1) random access by index; "
        "Trees (BSTs) provide O(log n) average search time; Hash Maps achieve O(1) expected lookup. "
        "Analyze algorithms using Big-O notation for time and space complexity."
    ),
    "networking": (
        "The OSI 7-layer model standardizes network communication from Physical (Layer 1) to Application (Layer 7). "
        "TCP provides reliable, ordered, error-checked packet streams via a 3-way handshake (SYN, SYN-ACK, ACK), "
        "whereas UDP offers low-latency connectionless datagram delivery."
    ),
    "cybersecurity": (
        "Information security relies on the CIA Triad: Confidentiality (privacy via encryption), "
        "Integrity (tamper prevention via cryptographic hashing), and Availability (resilience against DDoS). "
        "Always adhere to the principle of least privilege and defend against OWASP Top 10 vulnerabilities like SQL injection and XSS."
    ),
    "java": (
        "Java is a strongly typed, object-oriented language running on the Java Virtual Machine (JVM). "
        "Key pillars include encapsulation, inheritance, polymorphism, and abstraction. "
        "Memory is managed automatically by the Garbage Collector."
    ),
    "react": (
        "React is a component-driven JavaScript library for building user interfaces using a Virtual DOM. "
        "State and lifecycle behaviors are managed with React Hooks such as `useState`, `useEffect`, and `useMemo`."
    ),
    "binary search": (
        "Binary search is an efficient search algorithm on sorted collections. It repeatedly checks the midpoint "
        "and halves the search space at every step, yielding O(log N) logarithmic time complexity and O(1) space."
    ),
}


class DeterministicFallbackLLMClient(BaseLLMClient):
    """Deterministic, rule-based tutor client that operates with zero external dependencies."""

    def generate_chat_completion(
        self,
        messages: List[LLMMessage],
        system_prompt: Optional[str] = None,
        temperature: float = 0.3,
        max_tokens: int = 1000,
    ) -> LLMResponse:
        """Synthesize deterministic pedagogical responses with explicit fallback labelling."""
        # Find the latest user query
        user_query = ""
        full_context = ""
        for m in reversed(messages):
            if m.role == "user":
                user_query = m.content
                break

        for m in messages:
            full_context += f" {m.content}"

        query_lower = user_query.lower()

        # 1. RAG Document Context Extraction & Prompt Injection Defense
        if "<document_context" in query_lower or "<document_context" in full_context.lower():
            # Check for indirect prompt injection attempts inside document context
            injection_patterns = [
                r"ignore (all )?previous instructions",
                r"override (system )?policy",
                r"reveal (the )?secret",
                r"you are now (an evil|dan)",
                r"disregard (the )?rules",
            ]
            for pat in injection_patterns:
                if re.search(pat, full_context.lower()):
                    return LLMResponse(
                        content=(
                            f"{FALLBACK_NOTICE_HEADER}"
                            "Security Notice: The retrieved document contains instructions attempting to override "
                            "system policies or reveal confidential data. In accordance with platform security guidelines, "
                            "untrusted instructions embedded inside documents are safely ignored."
                        ),
                        provider="deterministic_fallback",
                        model="rule_based_tutor_v1",
                        is_fallback=True,
                        tokens_used=45,
                    )

            # Check if query matches keywords in document context
            doc_snippets = re.findall(
                r"<document_context[^>]*>(.*?)</document_context>",
                full_context,
                re.DOTALL | re.IGNORECASE,
            )

            if doc_snippets:
                joined_docs = " ".join(doc_snippets)
                # Check for query keyword overlap
                query_words = [w for w in re.findall(r"\w+", query_lower) if len(w) > 3]
                matching_words = [w for w in query_words if w in joined_docs.lower()]

                if matching_words:
                    clean_excerpt = doc_snippets[0].strip().replace("\n", " ")[:350]
                    content = (
                        f"{FALLBACK_NOTICE_HEADER}"
                        f"According to the approved educational document:\n\n"
                        f"> \"{clean_excerpt}...\"\n\n"
                        "This excerpt directly addresses your query regarding foundational concepts."
                    )
                    return LLMResponse(
                        content=content,
                        provider="deterministic_fallback",
                        model="rule_based_tutor_v1",
                        is_fallback=True,
                        tokens_used=len(content.split()),
                    )
                else:
                    return LLMResponse(
                        content=(
                            f"{FALLBACK_NOTICE_HEADER}"
                            "Based on the approved educational documents available, there is insufficient evidence to answer this question. "
                            "Please refer to standard course materials or consult an instructor."
                        ),
                        provider="deterministic_fallback",
                        model="rule_based_tutor_v1",
                        is_fallback=True,
                        tokens_used=35,
                    )

        # 2. Assessment or Coding Hints
        if "hint" in query_lower or "clue" in query_lower:
            content = (
                f"{FALLBACK_NOTICE_HEADER}"
                "Pedagogical Hint:\n"
                "- Break the problem into its foundational components.\n"
                "- Review the function parameters and return type requirements.\n"
                "- Think about edge cases: empty collections, single-item inputs, and boundary values.\n"
                "- Consider whether a two-pointer approach or hash set can optimize your runtime."
            )
            return LLMResponse(
                content=content,
                provider="deterministic_fallback",
                model="rule_based_tutor_v1",
                is_fallback=True,
                tokens_used=len(content.split()),
            )

        # 3. Career Guidance
        if "career" in query_lower or "roadmap" in query_lower or "job" in query_lower:
            content = (
                f"{FALLBACK_NOTICE_HEADER}"
                "Career Guidance Tip:\n"
                "- Review your Career Gap Analysis in the dashboard to identify prioritized competency gaps.\n"
                "- Focus on foundational prerequisites (mastery >= 60%) before tackling advanced enterprise frameworks.\n"
                "- Build demonstrable evidence by completing hands-on project milestones with public repository links.\n\n"
                "Note: SkillBridge AI provides skills assessment and roadmap synthesis but does not guarantee employment or compensation outcomes."
            )
            return LLMResponse(
                content=content,
                provider="deterministic_fallback",
                model="rule_based_tutor_v1",
                is_fallback=True,
                tokens_used=len(content.split()),
            )

        # 4. Domain Concept Explanations
        for keyword, explanation in CONCEPT_KNOWLEDGE.items():
            if keyword in query_lower:
                content = (
                    f"{FALLBACK_NOTICE_HEADER}"
                    f"Concept Explanation ({keyword.upper()}):\n\n"
                    f"{explanation}\n\n"
                    "Recommended Next Step: Take a diagnostic assessment in the Taxonomy tab to test your comprehension."
                )
                return LLMResponse(
                    content=content,
                    provider="deterministic_fallback",
                    model="rule_based_tutor_v1",
                    is_fallback=True,
                    tokens_used=len(content.split()),
                )

        # 5. Default General Response
        content = (
            f"{FALLBACK_NOTICE_HEADER}"
            "Hello! I am your SkillBridge AI Tutor operating in deterministic offline mode.\n\n"
            "I can assist you with:\n"
            "- Explaining technical concepts across Python, Java, SQL, DSA, Web Dev, Networking, and Cybersecurity.\n"
            "- Providing hints on coding exercises and assessments without spoiling solutions.\n"
            "- Interpreting your career gap analysis and roadmap milestones.\n"
            "- Answering questions grounded in approved educational documents.\n\n"
            "How can I assist your learning today?"
        )
        return LLMResponse(
            content=content,
            provider="deterministic_fallback",
            model="rule_based_tutor_v1",
            is_fallback=True,
            tokens_used=len(content.split()),
        )
