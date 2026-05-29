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
                name="Gojo Satoru 1/7 Scale Figure",
                description="Premium 1/7 scale figure of Satoru Gojo from Jujutsu Kaisen. Features incredible detail, dynamic posing, and interchangeable unmasked head.",
                price=149.99,
                image_url="https://placehold.co/400x400/1a1a20/a855f7?text=Gojo+Figure",
                category="Figures",
                stock=15
            ),
            models.Product(
                name="Demon Slayer Corps Haori",
                description="Authentic replica of the Demon Slayer Corps uniform jacket. Made from high-quality, breathable fabric with embroidered kanji.",
                price=59.99,
                image_url="https://placehold.co/400x400/1a1a20/a855f7?text=Haori",
                category="Apparel",
                stock=40
            ),
            models.Product(
                name="Akatsuki Cloud Hoodie",
                description="Comfortable black hoodie featuring the iconic red clouds of the Akatsuki. Perfect for casual wear and ninja missions.",
                price=45.00,
                image_url="https://placehold.co/400x400/1a1a20/a855f7?text=Akatsuki+Hoodie",
                category="Apparel",
                stock=25
            ),
            models.Product(
                name="Thousand Sunny Model Kit",
                description="Detailed model kit of the Straw Hat Pirates' second ship, the Thousand Sunny. Includes mini figures of the crew.",
                price=65.00,
                image_url="https://placehold.co/400x400/1a1a20/a855f7?text=Thousand+Sunny",
                category="Figures",
                stock=8
            ),
            models.Product(
                name="Attack on Titan Wall Scroll",
                description="High-quality fabric wall scroll featuring the Survey Corps charging into battle. Measures 33x44 inches.",
                price=24.99,
                image_url="https://placehold.co/400x400/1a1a20/a855f7?text=AOT+Scroll",
                category="Posters",
                stock=50
            ),
            models.Product(
                name="Konoha Headband",
                description="Metal plated Hidden Leaf Village ninja headband. Can be worn traditionally or styled in various ways.",
                price=15.99,
                image_url="https://placehold.co/400x400/1a1a20/a855f7?text=Headband",
                category="Accessories",
                stock=100
            )
        ]
        
        db.add_all(products)
        print("Seeded Anime Products.")
        
        db.commit()
        print("Database seeded successfully!")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
