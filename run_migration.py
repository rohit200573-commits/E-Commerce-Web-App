cart_code = """
# Cart helpers
def get_or_create_cart(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM carts WHERE user_id = ?', (user_id,))
    row = cursor.fetchone()
    if row:
        cart_id = row['id']
    else:
        cursor.execute('INSERT INTO carts (user_id) VALUES (?)', (user_id,))
        conn.commit()
        cart_id = cursor.lastrowid
    conn.close()
    return cart_id

def get_cart_items(user_id):
    cart_id = get_or_create_cart(user_id)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT ci.quantity, p.id as product_id, p.name, p.price, p.category, p.image_url, p.stock
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.cart_id = ?
    ''', (cart_id,))
    items = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return items

def update_cart_item(user_id, product_id, quantity):
    cart_id = get_or_create_cart(user_id)
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if quantity <= 0:
        cursor.execute('DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?', (cart_id, product_id))
    else:
        cursor.execute('SELECT id FROM cart_items WHERE cart_id = ? AND product_id = ?', (cart_id, product_id))
        if cursor.fetchone():
            cursor.execute('UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND product_id = ?', (quantity, cart_id, product_id))
        else:
            cursor.execute('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)', (cart_id, product_id, quantity))
    
    conn.commit()
    conn.close()
    return True

def clear_cart(user_id):
    cart_id = get_or_create_cart(user_id)
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM cart_items WHERE cart_id = ?', (cart_id,))
    conn.commit()
    conn.close()
    return True
"""

with open('database.py', 'a') as f:
    f.write("\n" + cart_code + "\n")

import database
database.init_db()
print("Migration successful")
