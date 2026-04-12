from app import app
from models import db, User


def seed_admin_account():
    """Seed the same admin account used by /setup into the configured database."""
    with app.app_context():
        username = "admin"
        password = "admin123"
        role = "admin"
        department = "Administration"

        admin_user = User.query.filter_by(username=username).first()

        if not admin_user:
            admin_user = User(username=username, role=role, department=department)
            admin_user.set_password(password)
            db.session.add(admin_user)
            action = "created"
        else:
            admin_user.role = role
            admin_user.department = department
            admin_user.set_password(password)
            action = "updated"

        try:
            db.session.commit()
            print(f"Admin account {action}: {username}")
        except Exception as e:
            db.session.rollback()
            print(f"Error seeding admin account: {e}")


if __name__ == "__main__":
    seed_admin_account()