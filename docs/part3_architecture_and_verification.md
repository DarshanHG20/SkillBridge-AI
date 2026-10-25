# SkillBridge AI — Part 3 Architecture & Verification Report

## Overview
SkillBridge AI Part 3 delivers the platform's primary USP: **the Core Adaptive Learning Engine, Multi-Domain Skill Taxonomy, Server-Side Graded Assessments, Extensible ML Mastery Pipeline, Career Intelligence, and Project-Based Learning**.

---

## 1. Skill Taxonomy & DAG Hierarchy
Configured 27 core technical skills across all 9 required domains:
1. **Python**: `python-basics`, `python-oop`, `python-advanced`
2. **Java**: `java-basics`, `java-oop`, `java-spring-framework`
3. **SQL**: `sql-fundamentals`, `sql-joins-aggregations`, `sql-indexing-optimization`
4. **DSA**: `dsa-arrays-strings`, `dsa-trees-graphs`, `dsa-dynamic-programming`
5. **Web Development**: `html-css-js`, `react-fundamentals`, `rest-api-design`
6. **Data Science**: `data-analysis-pandas`, `data-visualization`, `feature-engineering`
7. **AI / ML**: `ml-fundamentals`, `model-evaluation-metrics`, `deep-learning-pytorch`
8. **Networking**: `networking-fundamentals`, `tcp-ip-protocols`, `dns-http-architecture`
9. **Cybersecurity**: `cybersecurity-principles`, `web-security-owasp`, `network-defense-cryptography`

- **Prerequisites Graph**: Structured as a directed acyclic graph (DAG).
- **Cycle Detection**: Verified via Kahn’s topological sort algorithm (`SkillService.validate_dag`), guaranteeing an acyclic taxonomy graph.
- **Lock/Unlock Rules**: Mandatory prerequisite threshold set at `0.60` (60% mastery). Dependent skills remain locked until all mandatory prerequisites satisfy the threshold.

---

## 2. Assessments & Server-Side Grading Engine
- **Session Lifecycle**:
  - `POST /api/v1/assessments/{id}/start`: Creates an `AssessmentAttempt` session and delivers questions with answer keys and explanations stripped.
  - `POST /api/v1/assessments/attempts/{attempt_id}/submit`: Computes score server-side, records individual `AssessmentResponse` entries with diagnostic feedback, and triggers mastery updates.
- **Anti-Cheat & Validation**:
  - Prevents duplicate submissions: Submitting an already graded attempt returns `HTTP 400 Bad Request`.
  - Student ownership enforcement: Cross-user submissions or inspections return `HTTP 403 Forbidden`.
- **Diagnostic Feedback**:
  - Every graded question returns the learner's answer, correct answer, and a conceptual explanation string.

---

## 3. Dedicated Adaptive Learning Engine
- **Mastery Calibration**:
  - Uses weighted Bayesian / Exponential Moving Average updates:
    $$\text{New Mastery} = (1 - \alpha) \cdot \text{Old Mastery} + \alpha \cdot \text{Score Ratio} \quad (\alpha = 0.35)$$
  - Confidence score asymptotically increases with repeat attempts.
- **Weak Concept Diagnosis**:
  - Automatically identifies concepts where `mastery < 0.60` or recent error rate $\ge 0.40$ (40%).
- **Activity Selection & Difficulty Calibration**:
  1. *Rule 1 (Weak Concepts)*: Recommends `revision` drill on weakest concept with explanation:
     > *"Reinforce '{skill_title}'. Your recent mastery of {score}% is below the proficiency threshold (60%)."*
  2. *Rule 2 (In-Progress Skills, 0.60–0.85)*: Recommends intermediate `practice` drill to cross 85%.
  3. *Rule 3 (Advancement in DAG)*: Unlocks next unpracticed skill once prerequisites are met.
  4. *Rule 4 (Capstone Project)*: Recommends hands-on portfolio project once foundational mastery is attained.
  5. *Rule 5 (New Learner Baseline)*: Recommends foundational diagnostic check to establish initial baseline.

---

## 4. Extensible Machine Learning Pipeline
- **Data Generator**: `backend/app/ml/data_loader.py` generates explicitly labeled synthetic learner performance data (`data/synthetic_learner_dataset.csv`).
- **Reproducible Training Script**: `backend/app/ml/train_mastery_model.py`
  - Validates schema and performs 80/20 train/test split.
  - Evaluates **Zero-Rule Baseline** (`DummyClassifier(strategy='most_frequent')`): Accuracy: `0.7733`, F1: `0.8722`.
  - Evaluates **Logistic Regression**: Accuracy: `0.7900`, ROC-AUC: `0.7790`.
  - Evaluates **Random Forest**: Accuracy: `0.7867`, ROC-AUC: `0.7628`.
  - Selects winning model and persists to `saved_models/mastery_v1.joblib` and metrics to `saved_models/mastery_v1_metrics.json`.
- **Prediction Service (`MasteryPredictor`)**:
  - Exposes `predict_mastery_probability(features)`.
  - **Fallback Behavior**: If the model artifact is absent or corrupted, automatically falls back to deterministic heuristic domain rules, setting `is_fallback: True` and logging transparent reasons.

---

## 5. Career Intelligence & Personalized Roadmaps
- **Configurable Careers**: Backend Software Engineer, Data Scientist, AI/ML Engineer, Fullstack Web Developer, and Cybersecurity Analyst.
- **Weighted Readiness Formula**:
  $$\text{Readiness \%} = \frac{\sum \min(M_i, R_i) \cdot W_i}{\sum R_i \cdot W_i} \times 100\%$$
- **Personalized Roadmaps**: Generates 30, 60, and 90-day pathways sequenced by foundational gaps first, intermediate systems, and capstone milestones.
- **Mandatory Non-Guarantee Disclaimer**:
  > *"Career readiness scores and roadmap milestones are generated based on platform assessment records and standardized industry curricula. SkillBridge AI does not guarantee job placement, interview offers, or specific compensation outcomes."*

---

## 6. Project-Based Learning
- **Real-World Templates**:
  - Production-Ready E-Commerce REST API
  - Predictive Customer Churn Analysis Pipeline
  - Network Traffic & Port Vulnerability Scanner
- **Portfolio Tracking**:
  - Step-by-step deliverable milestones.
  - Evaluation rubrics across architecture, security, and testing.
  - Interactive progress updater with verification evidence notes (e.g. GitHub repository URL).

---

## 7. Flutter Mobile & Web Admin UI
- **Mobile Android App (`mobile_app`)**:
  - `AdaptiveHomeTab`: Recommendation card with "Why this was recommended", diagnosed weak concepts banner, and holistic metrics.
  - `SkillMasteryTab`: 9 technical domain chips, taxonomy cards, mastery progress bars, lock/mastered badges, and diagnostic test launcher.
  - `AssessmentQuizScreen`: Real-time timer, question stepper, option cards, and submission confirmation modal.
  - `AssessmentResultScreen`: Circular score gauge, pass/fail badge, adaptive feedback card, and per-question explanation review.
  - `CareerExplorationTab`: Career selector, weighted readiness gauge, top skill gaps list, 30/60/90-day roadmap generator, and disclaimer banner.
  - `ProjectCatalogTab`: Project catalog with milestones, rubrics, enrollment, and evidence submission.
- **Admin Web Console (`admin_dashboard`)**:
  - `CurriculumScreen`: 9-domain taxonomy overview, summary counters, and active question bank catalog.

---

## 8. Verification Results

### Backend (Pytest Suite):
```text
======================= 44 passed, 1 warning in 10.66s ========================
- tests/test_adaptive_engine.py: 4 passed
- tests/test_admin.py: 4 passed
- tests/test_assessments.py: 5 passed
- tests/test_auth.py: 9 passed
- tests/test_careers.py: 3 passed
- tests/test_config.py: 3 passed
- tests/test_health.py: 2 passed
- tests/test_ml_pipeline.py: 4 passed
- tests/test_projects.py: 2 passed
- tests/test_skills.py: 4 passed
- tests/test_users.py: 4 passed
```

### Flutter Mobile App (`mobile_app`):
```text
$ flutter analyze
Analyzing mobile_app...
No issues found! (ran in 2.1s)

$ flutter test
00:02 +8: All tests passed!
```

### Flutter Admin Web Dashboard (`admin_dashboard`):
```text
$ flutter analyze
Analyzing admin_dashboard...
No issues found! (ran in 1.8s)

$ flutter test
00:02 +4: All tests passed!
```
