# SkillBridge AI — Project Report

**Project Title:** SkillBridge AI: Cross-Platform AI-Driven Personalized Learning and Adaptive Assessment System  
**Event:** MERNOVA X 2026 Project Expo  
**Team Members:** (3 MCA Students, 1 Team Leader)  

---

## 1. Abstract
SkillBridge AI is a full-stack, cross-platform learning management system designed to provide personalized education paths using an Adaptive Learning Engine. Built entirely on the MERN stack (MongoDB, Express, React, Node.js) and Flutter, it allows seamless synchronization between a React-based web frontend and a Flutter mobile application. The platform features role-based access control, AI-powered study roadmaps, gamification, and robust coding assessments securely isolated via AST analysis.

## 2. Problem Statement
Modern learners struggle with generic, one-size-fits-all course curricula that fail to address individual knowledge gaps. Furthermore, educational platforms often lack cross-platform consistency—web applications and mobile applications act as disjointed silos. There is a critical need for an adaptive system that can dynamically assess a learner's skill mastery and sync this data in real-time across devices.

## 3. Objectives
*   Develop a unified Express.js REST API backed by MongoDB.
*   Deploy a React Web App and a Flutter Mobile App sharing the same authentication state and database.
*   Implement an Adaptive Learning Engine that tracks mastery on a skill DAG (Directed Acyclic Graph).
*   Provide Gamification (XP, streaks, and badges) and auto-generated Certificates.
*   Implement administrative telemetry and compliance logging.

## 4. Technology Stack
*   **Database:** MongoDB & Mongoose
*   **Backend API:** Node.js, Express.js (REST, JWT, bcrypt)
*   **Web Frontend:** React.js 18, Vite
*   **Mobile App:** Flutter 3.47, Dart
*   **Admin Dashboard:** Flutter Web

## 5. System Architecture
```
[ React Web App ] --------\
                           \     [ Node.js + Express REST API ]
                            )--> [  - Auth & Role Guards      ] ---> [ MongoDB ]
                           /     [  - Adaptive Engine         ]
[ Flutter Mobile App ] ---/
```
The backend acts as the Single Source of Truth (SSOT). Any progression—whether enrolling in a course, submitting a coding assignment, or mastering a skill—is persisted immediately and reflected on all platforms.

## 6. Database Design
The schema operates on an interconnected taxonomy model:
*   `Users` and `StudentProfiles` (handles Gamification XP and Streaks).
*   `Skills`, `SkillMastery`, and `SkillPrerequisites` (DAG structure).
*   `Courses` and `CourseProgress`.
*   `Assessments` and `Questions`.
*   `LearnerActivity`, `Notifications`, and `Certificates`.

## 7. Implementation Details
*   **API Security:** All routes are protected via JWT bearer tokens. Passwords are encrypted using bcrypt (12 rounds).
*   **Cross-Platform Sync:** Handled via deterministic endpoint mapping under `/api/v1/*`. Both React and Flutter utilize the same standard JSON schema.
*   **Adaptive Assessment:** An algorithm calculates skill mastery scores based on quiz correctness and historical accuracy, recommending weak concepts for review.
*   **Fast Unlock Mechanism:** Implemented a batch processing script to simulate 100% mastery for expo demonstrations (`/api/v1/skills/unlock-all-100`).

## 8. Testing & Validation
*   **Backend:** 34/34 Jest integration tests passed, covering auth, coding sandbox security, and data isolation.
*   **Flutter Mobile:** 28/28 widget & unit tests passed. `flutter analyze` returned 0 issues.
*   **React Web:** Successfully compiles via Vite.

## 9. Conclusion
SkillBridge AI successfully demonstrates how an advanced MERN architecture can seamlessly integrate with a Flutter mobile ecosystem. It addresses the educational need for tailored learning pathways while ensuring rock-solid data consistency across platforms, making it a robust contender for the MERNOVA X 2026 expo.
