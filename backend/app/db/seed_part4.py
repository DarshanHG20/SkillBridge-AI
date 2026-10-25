"""Seed data for Part 4: Approved educational documents and coding practice problems."""

import logging
from typing import Dict
from sqlalchemy.orm import Session

from app.models.rag_document import Document, DocumentChunk
from app.models.coding import CodingProblem
from app.rag.chunker import DocumentChunker
from app.rag.vector_index import PersistentVectorIndex


logger = logging.getLogger(__name__)

DOCUMENTS_SEED = [
    {
        "title": "Python Core Architecture & OOP Reference",
        "filename": "python_core_reference.txt",
        "file_type": "text/plain",
        "content": (
            "Python Core Architecture and Object-Oriented Programming Principles.\n\n"
            "1. Memory Model and Execution Flow:\n"
            "Python employs automatic garbage collection combining reference counting and cyclic generational collection. "
            "Variables in Python are references pointing to memory addresses of typed objects.\n\n"
            "2. Object-Oriented Paradigms:\n"
            "Classes are first-class objects created at runtime. Encapsulation is achieved via naming conventions: "
            "single underscore prefix (_protected) signals internal API, whereas double underscore (__private) triggers name mangling. "
            "Polymorphism is duck-typed: methods rely on structural compatibility rather than explicit inheritance declarations.\n\n"
            "3. Exception Handling & Context Managers:\n"
            "The 'with' statement guarantees deterministic resource cleanup via __enter__ and __exit__ dunder protocols. "
            "Never use bare except clauses as they suppress SystemExit and KeyboardInterrupt exceptions.\n\n"
            "4. Complexity of Built-in Primitives:\n"
            "List append and pop from the end run in amortized O(1) time, while inserting at index 0 incurs O(n) element shifts. "
            "Dictionaries and Sets utilize open-addressing hash tables with perturbation sequences, delivering average O(1) lookup time."
        ),
    },
    {
        "title": "Relational Database Design & SQL Optimization Guide",
        "filename": "sql_optimization_guide.txt",
        "file_type": "text/plain",
        "content": (
            "Relational Database Design, Normalization, and Query Optimization.\n\n"
            "1. Normalization Normal Forms:\n"
            "First Normal Form (1NF) demands atomic attributes and unique row identification. "
            "Second Normal Form (2NF) eliminates partial functional dependencies on composite keys. "
            "Third Normal Form (3NF) mandates that all non-key columns depend solely on the primary key, removing transitive dependencies.\n\n"
            "2. B-Tree Indexes & Query Execution Plans:\n"
            "Indexes maintain balanced multi-way tree structures enabling logarithmic search O(log N). "
            "Composite indexes conform to the Leftmost Prefix Rule: an index on (A, B) accelerates queries filtering on (A) or (A, B), "
            "but provides negligible assistance for filtering on (B) alone.\n\n"
            "3. Transactions and ACID Guarantees:\n"
            "Atomicity ensures all-or-nothing execution. Consistency preserves integrity constraints. "
            "Isolation prevents concurrent anomaly reads: Dirty Read, Non-repeatable Read, and Phantom Read. "
            "Durability guarantees committed transactions survive power outages through Write-Ahead Logging (WAL)."
        ),
    },
    {
        "title": "Data Structures & Algorithmic Complexity Handbook",
        "filename": "dsa_complexity_handbook.txt",
        "file_type": "text/plain",
        "content": (
            "Algorithmic Complexity, Search Strategies, and Classic Data Structures.\n\n"
            "1. Asymptotic Analysis:\n"
            "Big-O notation establishes worst-case upper bounds. Big-Omega indicates lower bounds, and Big-Theta reflects tight bounds. "
            "Binary search on sorted arrays divides the search space by half at each iteration, achieving O(log N) time and O(1) auxiliary space.\n\n"
            "2. Hash Tables & Collision Resolution:\n"
            "Hash functions map keys uniformly into bucket indexes. Collisions are handled via separate chaining (linked list buckets) "
            "or open addressing (linear probing, quadratic probing, double hashing). Under good load factors (< 0.75), lookups are O(1).\n\n"
            "3. Two-Pointer Technique:\n"
            "Iterating two pointers inward or in the same direction eliminates redundant nested loops, reducing O(N^2) searches to O(N). "
            "This technique is universally applicable to sorted array pair matching, palindrome validation, and cycle detection in linked lists."
        ),
    },
]

CODING_PROBLEMS_SEED = [
    {
        "slug": "two-sum",
        "title": "Two Sum Target Indices",
        "difficulty": "easy",
        "skill_slug": "dsa",
        "description": (
            "Given an array of integers `nums` and an integer `target`, return the indices of the two numbers such that they add up to `target`.\n\n"
            "You may assume that each input would have exactly one solution, and you may not use the same element twice. "
            "Return the list of two indices [index1, index2]."
        ),
        "starter_code": (
            "def two_sum(nums, target):\n"
            "    # Your code here\n"
            "    # Return list of two indices [i, j]\n"
            "    pass\n"
        ),
        "solution_template": (
            "def two_sum(nums, target):\n"
            "    seen = {}\n"
            "    for i, num in enumerate(nums):\n"
            "        complement = target - num\n"
            "        if complement in seen:\n"
            "            return [seen[complement], i]\n"
            "        seen[num] = i\n"
            "    return []\n"
        ),
        "test_cases": [
            {"input": [[2, 7, 11, 15], 9], "expected_output": [0, 1], "is_hidden": False},
            {"input": [[3, 2, 4], 6], "expected_output": [1, 2], "is_hidden": False},
            {"input": [[3, 3], 6], "expected_output": [0, 1], "is_hidden": True},
            {"input": [[1, 5, 8, 12, 19], 27], "expected_output": [2, 4], "is_hidden": True},
        ],
        "hints": [
            "Hint 1: A brute-force approach checks every pair using nested loops, which takes O(N^2) time.",
            "Hint 2: Can you use a hash map (dictionary) to remember numbers you've seen and check for `target - current_number` in O(1) time?",
            "Hint 3: Store each number and its index in the dictionary as you iterate through the list.",
        ],
        "rubric": {"function_name": "two_sum", "max_time_complexity": "O(N)", "space_complexity": "O(N)"},
    },
    {
        "slug": "palindrome-check",
        "title": "Alphanumeric Palindrome Validator",
        "difficulty": "easy",
        "skill_slug": "python-programming",
        "description": (
            "Write a function `is_palindrome(s)` that determines if a string `s` is a palindrome. "
            "Consider only alphanumeric characters and ignore cases.\n\n"
            "Return `True` if it is a palindrome, otherwise return `False`."
        ),
        "starter_code": (
            "def is_palindrome(s):\n"
            "    # Your code here\n"
            "    pass\n"
        ),
        "solution_template": (
            "def is_palindrome(s):\n"
            "    clean = [c.lower() for c in s if c.isalnum()]\n"
            "    return clean == clean[::-1]\n"
        ),
        "test_cases": [
            {"input": "A man, a plan, a canal: Panama", "expected_output": True, "is_hidden": False},
            {"input": "race a car", "expected_output": False, "is_hidden": False},
            {"input": " ", "expected_output": True, "is_hidden": True},
            {"input": "0P", "expected_output": False, "is_hidden": True},
        ],
        "hints": [
            "Hint 1: First filter out non-alphanumeric characters and normalize all letters to lowercase.",
            "Hint 2: In Python, you can check if a character is alphanumeric with `char.isalnum()`.",
            "Hint 3: Compare the cleaned string or list with its reverse.",
        ],
        "rubric": {"function_name": "is_palindrome", "max_time_complexity": "O(N)"},
    },
    {
        "slug": "valid-parentheses",
        "title": "Valid Parentheses Syntax",
        "difficulty": "easy",
        "skill_slug": "dsa",
        "description": (
            "Given a string `s` containing just the characters '(', ')', '{', '}', '[' and ']', "
            "determine if the input string is valid.\n\n"
            "An input string is valid if open brackets are closed by the same type of brackets, "
            "and open brackets are closed in the correct order."
        ),
        "starter_code": (
            "def is_valid_parentheses(s):\n"
            "    # Your code here\n"
            "    pass\n"
        ),
        "solution_template": (
            "def is_valid_parentheses(s):\n"
            "    stack = []\n"
            "    mapping = {')': '(', '}': '{', ']': '['}\n"
            "    for char in s:\n"
            "        if char in mapping:\n"
            "            top_element = stack.pop() if stack else '#'\n"
            "            if mapping[char] != top_element:\n"
            "                return False\n"
            "        else:\n"
            "            stack.append(char)\n"
            "    return not stack\n"
        ),
        "test_cases": [
            {"input": "()[]{}", "expected_output": True, "is_hidden": False},
            {"input": "(]", "expected_output": False, "is_hidden": False},
            {"input": "([)]", "expected_output": False, "is_hidden": True},
            {"input": "{[]}", "expected_output": True, "is_hidden": True},
        ],
        "hints": [
            "Hint 1: A Last-In-First-Out (LIFO) stack structure is well-suited for matching opening and closing brackets.",
            "Hint 2: When encountering an opening bracket, push it onto the stack. When encountering a closing bracket, check if it matches the top element.",
            "Hint 3: At the end of the string, the stack must be empty for the string to be valid.",
        ],
        "rubric": {"function_name": "is_valid_parentheses"},
    },
    {
        "slug": "binary-search",
        "title": "Binary Search Algorithm",
        "difficulty": "easy",
        "skill_slug": "dsa",
        "description": (
            "Given an array of sorted integers `nums` and a `target` value, write a function `binary_search(nums, target)` "
            "that returns the 0-based index of `target` in `nums`, or -1 if `target` is not found."
        ),
        "starter_code": (
            "def binary_search(nums, target):\n"
            "    # Your code here\n"
            "    pass\n"
        ),
        "solution_template": (
            "def binary_search(nums, target):\n"
            "    left, right = 0, len(nums) - 1\n"
            "    while left <= right:\n"
            "        mid = (left + right) // 2\n"
            "        if nums[mid] == target:\n"
            "            return mid\n"
            "        elif nums[mid] < target:\n"
            "            left = mid + 1\n"
            "        else:\n"
            "            right = mid - 1\n"
            "    return -1\n"
        ),
        "test_cases": [
            {"input": [[-1, 0, 3, 5, 9, 12], 9], "expected_output": 4, "is_hidden": False},
            {"input": [[-1, 0, 3, 5, 9, 12], 2], "expected_output": -1, "is_hidden": False},
            {"input": [[5], 5], "expected_output": 0, "is_hidden": True},
            {"input": [[1, 2, 3, 4, 5, 6, 7, 8], 1], "expected_output": 0, "is_hidden": True},
        ],
        "hints": [
            "Hint 1: Maintain two pointers: `left` at 0 and `right` at len(nums) - 1.",
            "Hint 2: Calculate `mid = (left + right) // 2` and compare `nums[mid]` to `target`.",
            "Hint 3: Halve your search space each step: if `nums[mid] < target`, move `left = mid + 1`.",
        ],
        "rubric": {"function_name": "binary_search", "max_time_complexity": "O(log N)"},
    },
]


def seed_part4_data(db: Session) -> Dict[str, int]:
    """Seed educational documents with vector indices and coding practice problems."""
    stats = {"documents": 0, "chunks": 0, "coding_problems": 0}

    # 1. Seed Documents & Chunks
    for doc_data in DOCUMENTS_SEED:
        existing = db.query(Document).filter(Document.title == doc_data["title"]).first()
        if not existing:
            raw_bytes = doc_data["content"].encode("utf-8")
            from app.rag.extractor import DocumentExtractor
            content_hash = DocumentExtractor.compute_hash(raw_bytes)
            
            # Chunk document pages
            pages = [(1, doc_data["content"])]
            text_chunks = DocumentChunker.chunk_document_pages(
                pages=pages,
                chunk_size=400,
                chunk_overlap=50,
            )

            doc = Document(
                user_id=None,
                title=doc_data["title"],
                filename=doc_data["filename"],
                file_type="txt",
                file_size_bytes=len(raw_bytes),
                content_hash=content_hash,
                is_approved=True,
                chunk_count=len(text_chunks),
            )
            db.add(doc)
            db.flush()
            stats["documents"] += 1

            for ch in text_chunks:
                record = DocumentChunk(
                    document_id=doc.id,
                    chunk_index=ch.chunk_index,
                    page_number=ch.page_number,
                    char_start=ch.char_start,
                    char_end=ch.char_end,
                    text_content=ch.text_content,
                )
                db.add(record)
                stats["chunks"] += 1

    # 2. Seed Coding Problems
    for p_data in CODING_PROBLEMS_SEED:
        existing_problem = db.query(CodingProblem).filter(CodingProblem.slug == p_data["slug"]).first()
        if not existing_problem:
            prob = CodingProblem(
                slug=p_data["slug"],
                title=p_data["title"],
                difficulty=p_data["difficulty"],
                skill_slug=p_data["skill_slug"],
                description=p_data["description"],
                starter_code=p_data["starter_code"],
                solution_template=p_data["solution_template"],
                test_cases_json=p_data["test_cases"],
                hints_json=p_data["hints"],
                rubric_json=p_data["rubric"],
            )
            db.add(prob)
            stats["coding_problems"] += 1

    db.commit()

    # Synchronize RAG vector index
    try:
        from app.rag.service import RAGService
        RAGService.rebuild_index(db)
    except Exception as e:
        logger.warning("Could not rebuild vector index during seed: %s", e)

    logger.info("Part 4 seeding completed: %s", stats)
    return stats
