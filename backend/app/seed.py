from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app import models
from app.routers.auth import get_password_hash

def seed_db():
    # Re-create database tables
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # Check and Seed Users
        admin_user = db.query(models.User).filter(models.User.email == "admin@chronos.com").first()
        if not admin_user:
            admin_user = models.User(
                username="admin",
                email="admin@chronos.com",
                hashed_password=get_password_hash("admin123"),
                role="admin"
            )
            db.add(admin_user)
            print("Seeded Admin User.")
            
        demo_user = db.query(models.User).filter(models.User.email == "user@chronos.com").first()
        if not demo_user:
            demo_user = models.User(
                username="user",
                email="user@chronos.com",
                hashed_password=get_password_hash("user123"),
                role="user"
            )
            db.add(demo_user)
            print("Seeded Demo User.")

        # Seed Products (Wipe first to make seeding clean and repeatable)
        db.query(models.OrderItem).delete()
        db.query(models.Order).delete()
        db.query(models.Product).delete()
        
        products = [
            models.Product(
                name="Chronos Eclipse",
                description="Sleek matte-black automatic chronograph with obsidian dial, luminous silver hour markers, and premium dark leather strap. Engineered with a precision Swiss caliber movement.",
                price=2400.0,
                image_url="assets/watches/eclipse.png",
                category="Automatic",
                stock=8
            ),
            models.Product(
                name="Aether Rose Gold",
                description="Brushed 18k rose gold automatic timepiece with an open-heart skeleton dial showing the intricate escapement wheel. Complete with a dark brown alligator leather strap.",
                price=4800.0,
                image_url="assets/watches/aether.png",
                category="Automatic",
                stock=5
            ),
            models.Product(
                name="Vanguard Carbon",
                description="Ultra-light forged carbon sports chronograph watch. Features active water resistance up to 200m, scratch-resistant sapphire crystal, and an integrated dark-green fluororubber strap.",
                price=3200.0,
                image_url="assets/watches/vanguard.png",
                category="Sport",
                stock=10
            ),
            models.Product(
                name="Stellar Orbit",
                description="A mechanical masterpiece featuring a dial slice from an authentic Gibeon meteorite. Includes a hand-engraved 24k gold lunar phase tracker and starlight-blue steel hands.",
                price=6500.0,
                image_url="assets/watches/stellar.png",
                category="Astronomical",
                stock=3
            ),
            models.Product(
                name="Onyx Curator",
                description="Handcrafted solid walnut-wood display box with soft charcoal velvet cushions. Safely stores, protects, and exhibits up to six of your finest mechanical timepieces.",
                price=350.0,
                image_url="assets/watches/curator.png",
                category="Accessories",
                stock=15
            )
        ]
        
        db.add_all(products)
        print("Seeded Chronos Products.")
        
        db.commit()
        print("Database seeded successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
