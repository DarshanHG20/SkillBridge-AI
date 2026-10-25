"""Secure CLI utility to provision an initial administrator account."""

import argparse
import sys
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User


def create_or_upgrade_admin(email: str, password: str, full_name: str) -> None:
    """Create a new administrator or elevate an existing account."""
    db = SessionLocal()
    try:
        normalized_email = email.lower().strip()
        user = db.query(User).filter(User.email == normalized_email).first()

        if user:
            print(f"[*] Account '{normalized_email}' already exists. Elevating role to 'admin'...")
            user.role = "admin"
            user.is_active = True
            user.is_verified = True
            if password:
                user.hashed_password = get_password_hash(password)
            db.commit()
            print(f"[+] Successfully updated '{normalized_email}' to Administrator (ID: {user.id}).")
        else:
            if not password:
                print("[-] Error: Password is required when provisioning a new administrator.", file=sys.stderr)
                sys.exit(1)

            print(f"[*] Creating new Administrator account '{normalized_email}'...")
            user = User(
                email=normalized_email,
                hashed_password=get_password_hash(password),
                full_name=full_name.strip(),
                role="admin",
                is_active=True,
                is_verified=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"[+] Administrator account successfully provisioned (ID: {user.id}, Role: {user.role}).")
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="SkillBridge AI - Provision Initial Administrator")
    parser.add_argument("--email", required=True, help="Administrator email address")
    parser.add_argument("--password", required=True, help="Strong password (minimum 8 characters)")
    parser.add_argument("--name", default="System Administrator", help="Administrator display name")

    args = parser.parse_args()

    if len(args.password.strip()) < 8:
        print("[-] Error: Admin password must be at least 8 characters long.", file=sys.stderr)
        sys.exit(1)

    create_or_upgrade_admin(args.email, args.password, args.name)


if __name__ == "__main__":
    main()
