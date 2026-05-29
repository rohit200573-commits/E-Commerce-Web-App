import sqlite3
import os

DB_PATH = 'senpaisupply.db'

def run():
    # 1. Update database.py text
    with open('database.py', 'r') as f:
        content = f.read()
    
    # The duplicate block is from "# Cart helpers" appearing a second time
    # Let's just find the last "# Cart helpers" and truncate there, then add our new stuff
    if content.count("# Cart helpers") > 1:
        last_idx = content.rfind("# Cart helpers")
        content = content[:last_idx].strip()
    
    # Append the wishlist helpers
    wishlist_helpers = """\n
# Wishlist helpers
def get_wishlist(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT p.* 
        FROM wishlists w
        JOIN products p ON w.product_id = p.id
        WHERE w.user_id = ?
        ORDER BY w.id DESC
    ''', (user_id,))
    items = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return items

def add_to_wishlist(user_id, product_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)', (user_id, product_id))
        conn.commit()
        success = True
    except sqlite3.IntegrityError:
        # Already in wishlist
        success = True
    conn.close()
    return success

def remove_from_wishlist(user_id, product_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM wishlists WHERE user_id = ? AND product_id = ?', (user_id, product_id))
    conn.commit()
    conn.close()
    return True
"""
    if "def get_wishlist" not in content:
        content += wishlist_helpers
        
    with open('database.py', 'w') as f:
        f.write(content)

    # 2. Update DB Schema
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS wishlists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(product_id) REFERENCES products(id),
            UNIQUE(user_id, product_id)
        )
    ''')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id)')
    conn.commit()
    conn.close()

if __name__ == '__main__':
    run()
    print("Database fix applied successfully.")
