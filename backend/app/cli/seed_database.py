"""CLI command to seed the SkillBridge AI database with core taxonomy and content."""

import sys
from app.core.database import SessionLocal
from app.db.seed_data import seed_database


def main() -> None:
    print("[INFO] Seeding SkillBridge AI database...")
    db = SessionLocal()
    try:
        stats = seed_database(db)
        print("[SUCCESS] Database seeding complete!")
        print(f"   Skills added: {stats['skills']}")
        print(f"   Prerequisites linked: {stats['prerequisites']}")
        print(f"   Assessments configured: {stats['assessments']}")
        print(f"   Questions loaded: {stats['questions']}")
        print(f"   Career paths configured: {stats['careers']}")
        print(f"   Projects seeded: {stats['projects']}")
    except Exception as exc:
        print(f"[ERROR] Error seeding database: {exc}", file=sys.stderr)
        db.rollback()
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
