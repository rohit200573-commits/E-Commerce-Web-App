import sqlite3
import os
import database

def run_migrations():
    print("==========================================================")
    print("            RUNNING DATABASE SCHEMA MIGRATIONS")
    print("==========================================================")
    print(f"[INFO] Accessing database file: {database.DATABASE_PATH}")
    
    conn = database.get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Example migration: check for discount_percentage column in products
        cursor.execute("PRAGMA table_info(products)")
        columns = [col['name'] for col in cursor.fetchall()]
        
        if 'discount_percentage' not in columns:
            print("[INFO] Migration required: Column 'discount_percentage' is missing from 'products' table.")
            # Execute alter query
            cursor.execute("ALTER TABLE products ADD COLUMN discount_percentage REAL DEFAULT 0.0")
            conn.commit()
            print("[SUCCESS] Altered table 'products' and added column 'discount_percentage'.")
        else:
            print("[INFO] Schema check: Column 'discount_percentage' is already present in 'products' table.")
            
        print("[SUCCESS] All schema migrations finished successfully!")
        
    except Exception as e:
        print(f"[ERROR] Migration failed: {e}")
    finally:
        conn.close()

if __name__ == '__main__':
    run_migrations()
