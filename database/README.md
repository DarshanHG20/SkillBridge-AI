# SkillBridge AI - Database Management & Migration Guide 🗄️

This directory hosts raw SQL schema definitions, database migration scripts, and seed fixtures.

---

## 1. Directory Structure

- `schema.sql`: Complete DDL reference for all 20 normalized tables across the 6 subsystems.
- `README.md`: This operational guide.
- `seeds/` *(Planned for Part 2/3)*: Initial taxonomy fixtures, seed skills, and mock questions.

---

## 2. Migration Strategy (Alembic)

SkillBridge AI uses **Alembic** managed under `backend/alembic.ini` and `backend/migrations/` to version control database schema evolutions.

### Applying Migrations
To upgrade the database to the latest schema:
```bash
cd backend
alembic upgrade head
```

### Creating New Migrations
When ORM models in `backend/app/models/` are added or updated:
```bash
cd backend
alembic revision --autogenerate -m "describe_migration"
```

### Rolling Back
To revert a migration:
```bash
cd backend
alembic downgrade -1
```

---

## 3. Local MySQL Initialization

If running local MySQL Community Edition (such as the local `MySQL97` service):
1. Connect via MySQL CLI or MySQL Workbench:
   ```bash
   mysql -u root -p
   ```
2. Create database and dedicated user:
   ```sql
   CREATE DATABASE IF NOT EXISTS skillbridge_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER IF NOT EXISTS 'skillbridge_user'@'localhost' IDENTIFIED BY 'skillbridge_dev_pass';
   GRANT ALL PRIVILEGES ON skillbridge_db.* TO 'skillbridge_user'@'localhost';
   FLUSH PRIVILEGES;
   ```
3. Alternatively, import the baseline schema directly:
   ```bash
   mysql -u skillbridge_user -p skillbridge_db < database/schema.sql
   ```
4. Or simply let Alembic run the migrations automatically via `alembic upgrade head`.
