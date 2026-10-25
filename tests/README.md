# SkillBridge AI - Test Suite Documentation 🧪

This directory and the module-specific test folders provide automated testing across the SkillBridge AI platform.

---

## 1. Test Architecture

The test suites are distributed close to their implementation to ensure rapid developer feedback:

1. **Backend Tests (`backend/tests/`)**:
   - Framework: `pytest`, `pytest-asyncio`, `httpx` (FastAPI `TestClient`).
   - Scope:
     - `test_health.py`: Verifies `/api/v1/health` and `/` discovery endpoint with live in-memory database.
     - `test_config.py`: Verifies Pydantic settings loading and CORS parsing logic.
     - *(Part 2+)*: Auth, RBAC, Skills DAG, and Adaptive Scoring engines.
2. **Mobile App Tests (`mobile_app/test/`)**:
   - Framework: `flutter_test`.
   - Scope:
     - `app_config_test.dart`: Validates compile-time environment configuration defaults.
     - `widget_test.dart`: Validates reusable UI widgets (`AppButton`, `StatusBadge`).
3. **Admin Dashboard Tests (`admin_dashboard/test/`)**:
   - Framework: `flutter_test`.
   - Scope:
     - `admin_widget_test.dart`: Validates Web UI components (`StatCard`).

---

## 2. Running All Tests

### Run Backend Tests:
```powershell
.\backend\venv\Scripts\pytest backend/tests -v
```

### Run Mobile App Tests:
```bash
cd mobile_app
flutter test
```

### Run Admin Dashboard Tests:
```bash
cd admin_dashboard
flutter test
```
