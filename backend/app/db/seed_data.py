"""Comprehensive Seed Data for SkillBridge AI Knowledge Taxonomy, Careers, and Projects.

Supports 9 skill domains:
1. Python
2. Java
3. SQL
4. DSA
5. Web Development
6. Data Science
7. AI / Machine Learning
8. Networking
9. Cybersecurity
"""

from typing import Any, Dict, List
from sqlalchemy.orm import Session

from app.models.skill import Skill, SkillPrerequisite
from app.models.assessment import Assessment, Question
from app.models.career import Career, CareerRequirement
from app.models.project import Project


SKILLS_SEED: List[Dict[str, Any]] = [
    # 1. Python
    {
        "slug": "python-basics",
        "title": "Python Syntax & Fundamentals",
        "category": "Python",
        "description": "Core syntax, data types, control structures, functions, and list comprehensions.",
        "difficulty_level": "beginner",
    },
    {
        "slug": "python-oop",
        "title": "Python Object-Oriented Programming",
        "category": "Python",
        "description": "Classes, inheritance, encapsulation, polymorphism, dunder methods, and decorators.",
        "difficulty_level": "intermediate",
    },
    {
        "slug": "python-advanced",
        "title": "Advanced Python & Concurrency",
        "category": "Python",
        "description": "Asyncio, generators, context managers, memory management, and metaprogramming.",
        "difficulty_level": "advanced",
    },

    # 2. Java
    {
        "slug": "java-basics",
        "title": "Java Fundamentals",
        "category": "Java",
        "description": "Java language fundamentals, JVM architecture, data types, and control flow.",
        "difficulty_level": "beginner",
    },
    {
        "slug": "java-oop",
        "title": "Java OOP & Collections",
        "category": "Java",
        "description": "Object-oriented design, Collections framework, Generics, and exception handling.",
        "difficulty_level": "intermediate",
    },
    {
        "slug": "java-spring-framework",
        "title": "Spring Boot & Enterprise Services",
        "category": "Java",
        "description": "Spring Boot RESTful microservices, Dependency Injection, and JPA/Hibernate.",
        "difficulty_level": "advanced",
    },

    # 3. SQL
    {
        "slug": "sql-fundamentals",
        "title": "SQL Relational Fundamentals",
        "category": "SQL",
        "description": "SELECT queries, WHERE filtering, ORDER BY, GROUP BY, and aggregate functions.",
        "difficulty_level": "beginner",
    },
    {
        "slug": "sql-joins-aggregations",
        "title": "Complex Queries & Joins",
        "category": "SQL",
        "description": "INNER/LEFT/OUTER JOINs, subqueries, CTEs, window functions, and schema design.",
        "difficulty_level": "intermediate",
    },
    {
        "slug": "sql-indexing-optimization",
        "title": "Database Indexing & Query Tuning",
        "category": "SQL",
        "description": "B-Trees, EXPLAIN query plans, transaction isolation levels, and query optimization.",
        "difficulty_level": "advanced",
    },

    # 4. DSA (Data Structures & Algorithms)
    {
        "slug": "dsa-arrays-strings",
        "title": "Arrays, Strings & Two Pointers",
        "category": "DSA",
        "description": "Time/space complexity (Big-O), sliding window, two-pointer techniques, and binary search.",
        "difficulty_level": "beginner",
    },
    {
        "slug": "dsa-trees-graphs",
        "title": "Trees, Graphs & Traversal",
        "category": "DSA",
        "description": "Binary search trees, BFS, DFS, Dijkstra algorithm, and topological sorting.",
        "difficulty_level": "intermediate",
    },
    {
        "slug": "dsa-dynamic-programming",
        "title": "Dynamic Programming & Optimization",
        "category": "DSA",
        "description": "Memoization, tabulation, knapsack problems, and state transition relations.",
        "difficulty_level": "advanced",
    },

    # 5. Web Development
    {
        "slug": "html-css-js",
        "title": "Web Foundations: HTML, CSS & Vanilla JS",
        "category": "Web Development",
        "description": "Semantic markup, modern CSS Flexbox/Grid, DOM manipulation, and asynchronous JS (Promises/fetch).",
        "difficulty_level": "beginner",
    },
    {
        "slug": "react-fundamentals",
        "title": "Modern Frontend with React",
        "category": "Web Development",
        "description": "Components, JSX, Hooks (useState, useEffect, useMemo), state management, and routing.",
        "difficulty_level": "intermediate",
    },
    {
        "slug": "rest-api-design",
        "title": "REST API Architecture & Web Security",
        "category": "Web Development",
        "description": "RESTful resource design, HTTP status codes, authentication, CORS, rate limiting, and OpenAPI.",
        "difficulty_level": "intermediate",
    },

    # 6. Data Science
    {
        "slug": "data-analysis-pandas",
        "title": "Data Manipulation with Pandas & NumPy",
        "category": "Data Science",
        "description": "DataFrame operations, data wrangling, missing value handling, and vectorized computations.",
        "difficulty_level": "beginner",
    },
    {
        "slug": "data-visualization",
        "title": "Exploratory Data Analysis & Visualization",
        "category": "Data Science",
        "description": "Statistical storytelling using Matplotlib, Seaborn, and interactive dashboards.",
        "difficulty_level": "intermediate",
    },
    {
        "slug": "feature-engineering",
        "title": "Feature Engineering & Preprocessing",
        "category": "Data Science",
        "description": "Categorical encoding, scaling, imputation, feature selection, and dimensionality reduction.",
        "difficulty_level": "advanced",
    },

    # 7. AI / Machine Learning
    {
        "slug": "ml-fundamentals",
        "title": "Supervised & Unsupervised Learning",
        "category": "AI/ML",
        "description": "Linear/Logistic Regression, Decision Trees, Random Forests, K-Means clustering, and train/test splits.",
        "difficulty_level": "beginner",
    },
    {
        "slug": "model-evaluation-metrics",
        "title": "Model Evaluation & Cross-Validation",
        "category": "AI/ML",
        "description": "Confusion matrix, ROC-AUC, Precision, Recall, F1-Score, bias-variance tradeoff, and hyperparameter tuning.",
        "difficulty_level": "intermediate",
    },
    {
        "slug": "deep-learning-pytorch",
        "title": "Deep Learning & Neural Networks",
        "category": "AI/ML",
        "description": "Perceptrons, backpropagation, CNNs, RNNs, Transformers, and PyTorch model training pipelines.",
        "difficulty_level": "advanced",
    },

    # 8. Networking
    {
        "slug": "networking-fundamentals",
        "title": "Computer Networking Essentials",
        "category": "Networking",
        "description": "OSI 7-Layer model, TCP/IP stack, IP addressing, subnets, and routing basics.",
        "difficulty_level": "beginner",
    },
    {
        "slug": "tcp-ip-protocols",
        "title": "Transport & Application Protocols",
        "category": "Networking",
        "description": "TCP 3-way handshake, UDP vs TCP, sockets, flow control, and congestion avoidance.",
        "difficulty_level": "intermediate",
    },
    {
        "slug": "dns-http-architecture",
        "title": "DNS, HTTP/HTTPS & Web Protocols",
        "category": "Networking",
        "description": "DNS resolution hierarchy, HTTP/1.1 vs HTTP/2 vs HTTP/3, TLS handshake, and CDN architectures.",
        "difficulty_level": "advanced",
    },

    # 9. Cybersecurity
    {
        "slug": "cybersecurity-principles",
        "title": "Cybersecurity Foundations",
        "category": "Cybersecurity",
        "description": "CIA Triad, threat modeling, authentication vs authorization, least privilege, and hashing.",
        "difficulty_level": "beginner",
    },
    {
        "slug": "web-security-owasp",
        "title": "Application Security & OWASP Top 10",
        "category": "Cybersecurity",
        "description": "SQL Injection, Cross-Site Scripting (XSS), CSRF, security headers, and secure coding practices.",
        "difficulty_level": "intermediate",
    },
    {
        "slug": "network-defense-cryptography",
        "title": "Applied Cryptography & Network Defense",
        "category": "Cybersecurity",
        "description": "Symmetric vs asymmetric encryption (AES, RSA), digital certificates, firewalls, and IDS/IPS.",
        "difficulty_level": "advanced",
    },
]

PREREQUISITES_SEED = [
    # Python hierarchy
    ("python-oop", "python-basics", "mandatory"),
    ("python-advanced", "python-oop", "mandatory"),
    # DSA hierarchy
    ("dsa-arrays-strings", "python-basics", "recommended"),
    ("dsa-trees-graphs", "dsa-arrays-strings", "mandatory"),
    ("dsa-dynamic-programming", "dsa-trees-graphs", "mandatory"),
    # Java hierarchy
    ("java-oop", "java-basics", "mandatory"),
    ("java-spring-framework", "java-oop", "mandatory"),
    # SQL hierarchy
    ("sql-joins-aggregations", "sql-fundamentals", "mandatory"),
    ("sql-indexing-optimization", "sql-joins-aggregations", "mandatory"),
    # Web Dev hierarchy
    ("react-fundamentals", "html-css-js", "mandatory"),
    ("rest-api-design", "html-css-js", "recommended"),
    # Data Science hierarchy
    ("data-analysis-pandas", "python-basics", "mandatory"),
    ("data-analysis-pandas", "sql-fundamentals", "recommended"),
    ("data-visualization", "data-analysis-pandas", "mandatory"),
    ("feature-engineering", "data-analysis-pandas", "mandatory"),
    # AI/ML hierarchy
    ("ml-fundamentals", "data-analysis-pandas", "mandatory"),
    ("model-evaluation-metrics", "ml-fundamentals", "mandatory"),
    ("deep-learning-pytorch", "model-evaluation-metrics", "mandatory"),
    # Networking hierarchy
    ("tcp-ip-protocols", "networking-fundamentals", "mandatory"),
    ("dns-http-architecture", "tcp-ip-protocols", "mandatory"),
    # Cybersecurity hierarchy
    ("cybersecurity-principles", "networking-fundamentals", "recommended"),
    ("web-security-owasp", "cybersecurity-principles", "mandatory"),
    ("web-security-owasp", "html-css-js", "recommended"),
    ("network-defense-cryptography", "cybersecurity-principles", "mandatory"),
]

ASSESSMENTS_SEED = [
    {
        "skill_slug": "python-basics",
        "title": "Python Foundations Diagnostic Assessment",
        "description": "Evaluate understanding of core Python syntax, variables, mutable vs immutable types, and control flow.",
        "assessment_type": "diagnostic",
        "pass_percentage": 70.0,
        "time_limit_minutes": 15,
        "questions": [
            {
                "prompt": "Which of the following data types in Python is immutable?",
                "question_type": "single_choice",
                "options": ["List", "Dictionary", "Tuple", "Set"],
                "correct_answer": "Tuple",
                "explanation": "Tuples in Python cannot be modified after creation, making them immutable. Lists, Dictionaries, and Sets can be mutated in place.",
                "difficulty": "easy",
                "points": 10,
            },
            {
                "prompt": "What is the output of the expression: `[x**2 for x in range(4) if x % 2 == 0]`?",
                "question_type": "single_choice",
                "options": ["[0, 4]", "[0, 1, 4, 9]", "[4]", "[0, 2]"],
                "correct_answer": "[0, 4]",
                "explanation": "range(4) produces 0, 1, 2, 3. The even numbers are 0 and 2. Squaring them yields [0**2, 2**2] = [0, 4].",
                "difficulty": "medium",
                "points": 10,
            },
            {
                "prompt": "What happens when you pass a mutable list as a default argument to a function in Python?",
                "question_type": "single_choice",
                "options": [
                    "A new list is instantiated on every function call",
                    "The same list object is retained and shared across invocations",
                    "Python raises a SyntaxError at compilation time",
                    "The list is automatically converted to an immutable tuple"
                ],
                "correct_answer": "The same list object is retained and shared across invocations",
                "explanation": "Default arguments are evaluated once when the function definition is executed, not each time the function is called. Mutating a default list retains changes across future calls.",
                "difficulty": "medium",
                "points": 10,
            },
            {
                "prompt": "Which built-in function returns both the index and the item while iterating over a collection?",
                "question_type": "single_choice",
                "options": ["zip()", "map()", "enumerate()", "filter()"],
                "correct_answer": "enumerate()",
                "explanation": "enumerate() takes an iterable and returns an enumerate object yielding tuples of (index, item).",
                "difficulty": "easy",
                "points": 10,
            },
        ],
    },
    {
        "skill_slug": "sql-fundamentals",
        "title": "SQL Querying & Filtering Assessment",
        "description": "Assess competency in basic SQL queries, aggregation, filtering, and table relationships.",
        "assessment_type": "formative",
        "pass_percentage": 75.0,
        "time_limit_minutes": 15,
        "questions": [
            {
                "prompt": "Which SQL clause is used to filter groups created by the GROUP BY clause?",
                "question_type": "single_choice",
                "options": ["WHERE", "HAVING", "ORDER BY", "FILTER"],
                "correct_answer": "HAVING",
                "explanation": "WHERE filters rows before aggregation, whereas HAVING filters groups after aggregation.",
                "difficulty": "easy",
                "points": 10,
            },
            {
                "prompt": "What is the result of an INNER JOIN between two tables?",
                "question_type": "single_choice",
                "options": [
                    "All rows from both tables regardless of match",
                    "All rows from the left table and only matching rows from the right",
                    "Only rows that satisfy the join condition in both tables",
                    "All rows with NULLs filled for non-matching columns"
                ],
                "correct_answer": "Only rows that satisfy the join condition in both tables",
                "explanation": "An INNER JOIN selects only records that have matching values in both tables based on the ON condition.",
                "difficulty": "easy",
                "points": 10,
            },
            {
                "prompt": "Which keyword eliminates duplicate rows from the query result set?",
                "question_type": "single_choice",
                "options": ["UNIQUE", "DISTINCT", "DIFFERENT", "ISOLATE"],
                "correct_answer": "DISTINCT",
                "explanation": "The SELECT DISTINCT statement is used to return only distinct (different) values from the dataset.",
                "difficulty": "easy",
                "points": 10,
            },
        ],
    },
    {
        "skill_slug": "dsa-arrays-strings",
        "title": "DSA: Arrays & Two Pointers Evaluation",
        "description": "Assess fundamental algorithmic thinking, Big-O analysis, and two-pointer strategies.",
        "assessment_type": "formative",
        "pass_percentage": 70.0,
        "time_limit_minutes": 20,
        "questions": [
            {
                "prompt": "What is the average time complexity of looking up an element by index in an array?",
                "question_type": "single_choice",
                "options": ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
                "correct_answer": "O(1)",
                "explanation": "Arrays store elements in contiguous memory locations, allowing instant O(1) random access via arithmetic offset.",
                "difficulty": "easy",
                "points": 10,
            },
            {
                "prompt": "Which technique is most optimal to check if a sorted array contains two numbers that sum up to a target T?",
                "question_type": "single_choice",
                "options": [
                    "Two nested loops checking every pair (O(n^2))",
                    "Two-pointer approach from left and right boundaries (O(n))",
                    "Dynamic programming matrix (O(n^2))",
                    "Depth First Search on array index graph (O(2^n))"
                ],
                "correct_answer": "Two-pointer approach from left and right boundaries (O(n))",
                "explanation": "Because the array is already sorted, moving the left pointer inward increases the sum, and moving the right pointer inward decreases the sum, achieving O(n) time and O(1) space.",
                "difficulty": "medium",
                "points": 10,
            },
        ],
    },
    {
        "skill_slug": "networking-fundamentals",
        "title": "Networking Core Diagnostic",
        "description": "Test comprehension of the OSI layer model, packets, ports, and IP addressing.",
        "assessment_type": "diagnostic",
        "pass_percentage": 70.0,
        "time_limit_minutes": 15,
        "questions": [
            {
                "prompt": "Which layer of the OSI model is responsible for end-to-end communication, reliability, and flow control?",
                "question_type": "single_choice",
                "options": ["Network Layer (Layer 3)", "Transport Layer (Layer 4)", "Data Link Layer (Layer 2)", "Session Layer (Layer 5)"],
                "correct_answer": "Transport Layer (Layer 4)",
                "explanation": "Layer 4 (Transport Layer, e.g. TCP/UDP) handles end-to-end packet delivery, segmentation, flow control, and error checking.",
                "difficulty": "easy",
                "points": 10,
            },
            {
                "prompt": "What is the default port used for secure encrypted HTTPS traffic?",
                "question_type": "single_choice",
                "options": ["80", "8080", "443", "22"],
                "correct_answer": "443",
                "explanation": "Port 80 is default for unencrypted HTTP, whereas port 443 is the standard port for TLS/HTTPS.",
                "difficulty": "easy",
                "points": 10,
            },
        ],
    },
    {
        "skill_slug": "cybersecurity-principles",
        "title": "Cybersecurity Foundations Diagnostic",
        "description": "Evaluate basic security awareness, the CIA Triad, and cryptographic fundamentals.",
        "assessment_type": "diagnostic",
        "pass_percentage": 70.0,
        "time_limit_minutes": 15,
        "questions": [
            {
                "prompt": "What are the three pillars of the classic CIA Triad in information security?",
                "question_type": "single_choice",
                "options": [
                    "Confidentiality, Integrity, Availability",
                    "Control, Inspection, Authentication",
                    "Cryptography, Identity, Authorization",
                    "Compliance, Isolation, Audit"
                ],
                "correct_answer": "Confidentiality, Integrity, Availability",
                "explanation": "The CIA Triad stands for Confidentiality (privacy of data), Integrity (trustworthiness of data), and Availability (accessibility of systems).",
                "difficulty": "easy",
                "points": 10,
            },
            {
                "prompt": "Why should passwords never be stored using simple MD5 or SHA-256 without salt and key derivation?",
                "question_type": "single_choice",
                "options": [
                    "They produce output strings that are too long for database columns",
                    "They are fast general-purpose hashes susceptible to precomputed Rainbow Table attacks and GPU brute-force",
                    "MD5 is an asymmetric encryption algorithm",
                    "Passwords hashed with SHA-256 can be decrypted mathematically in reverse"
                ],
                "correct_answer": "They are fast general-purpose hashes susceptible to precomputed Rainbow Table attacks and GPU brute-force",
                "explanation": "Fast cryptographic digests allow millions of guesses per second on modern hardware. Secure password storage requires salted, computationally expensive key derivation functions like bcrypt or Argon2.",
                "difficulty": "medium",
                "points": 10,
            },
        ],
    },
]

CAREERS_SEED = [
    {
        "slug": "backend-software-engineer",
        "title": "Backend Software Engineer",
        "industry": "Software Engineering",
        "average_salary_range": "$95,000 - $145,000",
        "description": "Architects resilient web APIs, microservices, database schemas, and background worker systems.",
        "requirements": [
            ("python-basics", 0.85, 1.2),
            ("python-oop", 0.80, 1.1),
            ("sql-fundamentals", 0.85, 1.2),
            ("sql-joins-aggregations", 0.80, 1.0),
            ("rest-api-design", 0.85, 1.3),
            ("dsa-arrays-strings", 0.75, 1.0),
            ("networking-fundamentals", 0.70, 0.8),
        ],
    },
    {
        "slug": "data-scientist",
        "title": "Data Scientist",
        "industry": "Data & Analytics",
        "average_salary_range": "$100,000 - $155,000",
        "description": "Extracts actionable predictive insights from complex datasets using statistics, machine learning, and visualization.",
        "requirements": [
            ("python-basics", 0.85, 1.1),
            ("sql-fundamentals", 0.85, 1.2),
            ("data-analysis-pandas", 0.90, 1.4),
            ("data-visualization", 0.80, 1.0),
            ("ml-fundamentals", 0.85, 1.3),
            ("model-evaluation-metrics", 0.80, 1.1),
        ],
    },
    {
        "slug": "ai-ml-engineer",
        "title": "AI / Machine Learning Engineer",
        "industry": "Artificial Intelligence",
        "average_salary_range": "$115,000 - $175,000",
        "description": "Designs, trains, deploys, and monitors scalable deep learning and machine learning systems in production.",
        "requirements": [
            ("python-basics", 0.90, 1.2),
            ("python-oop", 0.85, 1.0),
            ("data-analysis-pandas", 0.85, 1.1),
            ("ml-fundamentals", 0.90, 1.4),
            ("model-evaluation-metrics", 0.85, 1.2),
            ("deep-learning-pytorch", 0.85, 1.5),
        ],
    },
    {
        "slug": "cybersecurity-analyst",
        "title": "Cybersecurity & Security Operations Analyst",
        "industry": "Information Security",
        "average_salary_range": "$90,000 - $135,000",
        "description": "Protects organizational assets by identifying vulnerabilities, assessing threat vectors, and hardening network infrastructure.",
        "requirements": [
            ("networking-fundamentals", 0.85, 1.3),
            ("tcp-ip-protocols", 0.85, 1.2),
            ("cybersecurity-principles", 0.90, 1.4),
            ("web-security-owasp", 0.85, 1.3),
            ("network-defense-cryptography", 0.80, 1.1),
        ],
    },
    {
        "slug": "fullstack-developer",
        "title": "Full Stack Web Developer",
        "industry": "Web Development",
        "average_salary_range": "$90,000 - $140,000",
        "description": "Builds end-to-end web applications combining intuitive frontends, robust REST APIs, and scalable databases.",
        "requirements": [
            ("html-css-js", 0.85, 1.2),
            ("react-fundamentals", 0.85, 1.3),
            ("rest-api-design", 0.80, 1.1),
            ("sql-fundamentals", 0.80, 1.0),
            ("python-basics", 0.80, 1.0),
        ],
    },
]

PROJECTS_SEED = [
    {
        "title": "Production-Ready E-Commerce REST API",
        "description": "Develop a secured e-commerce backend with product catalog filtering, cart transactions, and JWT authentication.",
        "difficulty": "intermediate",
        "recommended_skills": ["python-basics", "python-oop", "sql-fundamentals", "rest-api-design"],
        "rubric": {
            "architecture": "Clean layered architecture (Routers, Services, Repositories)",
            "security": "Passes OWASP top 10 checks with password hashing and token expiry",
            "database": "Correct schema design with foreign key constraints and indexed queries",
            "testing": "Comprehensive pytest test coverage of critical checkout paths",
        },
        "milestones": [
            {"step": 1, "title": "Database Schema & Models", "description": "Design normalized tables for Users, Products, Orders, and Items."},
            {"step": 2, "title": "Authentication & RBAC", "description": "Implement JWT bearer auth for customers and store admins."},
            {"step": 3, "title": "Transactional Checkout API", "description": "Enforce atomic database commits when placing an order."},
            {"step": 4, "title": "Automated Test Suite", "description": "Write deterministic unit and integration tests with pytest."},
        ],
    },
    {
        "title": "Predictive Customer Churn Analysis Pipeline",
        "description": "Perform end-to-end data analysis, feature engineering, and model training to predict customer attrition.",
        "difficulty": "intermediate",
        "recommended_skills": ["python-basics", "data-analysis-pandas", "ml-fundamentals", "model-evaluation-metrics"],
        "rubric": {
            "eda": "Thorough visual exploration of class imbalance and correlations",
            "preprocessing": "Correct handling of missing values and categorical encoding",
            "modeling": "Comparison of Logistic Regression baseline against Random Forest",
            "evaluation": "Clear ROC-AUC, Precision, and Recall reporting with business interpretation",
        },
        "milestones": [
            {"step": 1, "title": "Data Ingestion & Cleaning", "description": "Load churn dataset, handle outliers and null values."},
            {"step": 2, "title": "Feature Engineering", "description": "Scale numerical features and encode categorical variables."},
            {"step": 3, "title": "Baseline vs Tuned Model", "description": "Train baseline classifier and compare with tuned Random Forest."},
            {"step": 4, "title": "Evaluation & Summary Report", "description": "Generate confusion matrix, ROC curve, and strategic retention insights."},
        ],
    },
    {
        "title": "Network Traffic & Port Vulnerability Scanner",
        "description": "Build a modular network security scanner that discovers open ports, flags insecure services, and checks headers.",
        "difficulty": "advanced",
        "recommended_skills": ["networking-fundamentals", "tcp-ip-protocols", "cybersecurity-principles", "web-security-owasp"],
        "rubric": {
            "protocol_handling": "Accurate TCP socket connection handling and timeout control",
            "security_reporting": "Structured vulnerability severity classification (Low/Med/High)",
            "safety_controls": "Strict consent and localhost/internal subnet restrictions",
        },
        "milestones": [
            {"step": 1, "title": "Socket Connection Engine", "description": "Implement non-blocking socket probes across standard port ranges."},
            {"step": 2, "title": "Banner Grabbing & Service Detection", "description": "Inspect response banners to identify running software versions."},
            {"step": 3, "title": "HTTP Security Header Audit", "description": "Verify CSP, HSTS, X-Content-Type-Options, and X-Frame-Options."},
            {"step": 4, "title": "Executive Security Audit Report", "description": "Compile structured markdown report with remediation guidance."},
        ],
    },
]


def seed_database(db: Session) -> Dict[str, int]:
    """Idempotently seed the knowledge taxonomy, prerequisites, assessments, careers, and projects."""
    stats = {"skills": 0, "prerequisites": 0, "assessments": 0, "questions": 0, "careers": 0, "projects": 0}

    # 1. Seed Skills
    skill_map: Dict[str, Skill] = {}
    for item in SKILLS_SEED:
        existing = db.query(Skill).filter(Skill.slug == item["slug"]).first()
        if not existing:
            skill = Skill(
                slug=item["slug"],
                title=item["title"],
                category=item["category"],
                description=item["description"],
                difficulty_level=item["difficulty_level"],
            )
            db.add(skill)
            db.flush()
            skill_map[item["slug"]] = skill
            stats["skills"] += 1
        else:
            skill_map[item["slug"]] = existing

    # 2. Seed Prerequisites
    for target_slug, prereq_slug, req_type in PREREQUISITES_SEED:
        target = skill_map.get(target_slug)
        prereq = skill_map.get(prereq_slug)
        if target and prereq:
            existing_prereq = (
                db.query(SkillPrerequisite)
                .filter(
                    SkillPrerequisite.skill_id == target.id,
                    SkillPrerequisite.prerequisite_skill_id == prereq.id,
                )
                .first()
            )
            if not existing_prereq:
                prereq_entry = SkillPrerequisite(
                    skill_id=target.id,
                    prerequisite_skill_id=prereq.id,
                    requirement_type=req_type,
                )
                db.add(prereq_entry)
                stats["prerequisites"] += 1

    # 3. Seed Assessments & Questions
    for a_data in ASSESSMENTS_SEED:
        target_skill = skill_map.get(a_data["skill_slug"])
        if not target_skill:
            continue

        existing_assessment = db.query(Assessment).filter(Assessment.skill_id == target_skill.id).first()
        if not existing_assessment:
            assessment = Assessment(
                title=a_data["title"],
                description=a_data["description"],
                skill_id=target_skill.id,
                assessment_type=a_data["assessment_type"],
                pass_percentage=a_data["pass_percentage"],
                time_limit_minutes=a_data["time_limit_minutes"],
            )
            db.add(assessment)
            db.flush()
            stats["assessments"] += 1

            for q_data in a_data["questions"]:
                question = Question(
                    assessment_id=assessment.id,
                    prompt=q_data["prompt"],
                    question_type=q_data["question_type"],
                    options_json=q_data["options"],
                    correct_answer_json=q_data["correct_answer"],
                    explanation=q_data["explanation"],
                    difficulty=q_data["difficulty"],
                    points=q_data["points"],
                )
                db.add(question)
                stats["questions"] += 1

    # 4. Seed Careers & Requirements
    for c_data in CAREERS_SEED:
        existing_career = db.query(Career).filter(Career.slug == c_data["slug"]).first()
        if not existing_career:
            career = Career(
                slug=c_data["slug"],
                title=c_data["title"],
                description=c_data["description"],
                average_salary_range=c_data["average_salary_range"],
                industry=c_data["industry"],
            )
            db.add(career)
            db.flush()
            stats["careers"] += 1

            for req_slug, min_mastery, weight in c_data["requirements"]:
                req_skill = skill_map.get(req_slug)
                if req_skill:
                    req_entry = CareerRequirement(
                        career_id=career.id,
                        skill_id=req_skill.id,
                        minimum_mastery_level=min_mastery,
                        weight=weight,
                    )
                    db.add(req_entry)

    # 5. Seed Project Templates
    for p_data in PROJECTS_SEED:
        existing_project = db.query(Project).filter(Project.title == p_data["title"]).first()
        if not existing_project:
            project = Project(
                title=p_data["title"],
                description=p_data["description"],
                difficulty=p_data["difficulty"],
                rubric_json=p_data["rubric"],
                milestones_json=p_data["milestones"],
                recommended_skills_json=p_data["recommended_skills"],
            )
            db.add(project)
            stats["projects"] += 1

    # 6. Seed Part 4 RAG Documents & Coding Practice Problems
    try:
        from app.db.seed_part4 import seed_part4_data
        part4_stats = seed_part4_data(db)
        stats.update(part4_stats)
    except Exception as exc:
        pass

    db.commit()
    return stats
