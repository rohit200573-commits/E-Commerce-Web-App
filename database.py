import sqlite3
import os
import bcrypt

DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'senpaisupply.db')

def get_db_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    conn = get_db_connection()
    conn.execute("PRAGMA journal_mode=WAL;")
    cursor = conn.cursor()

    # Create users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user'
        )
    ''')

    # Create products table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            price REAL NOT NULL,
            category TEXT NOT NULL,
            stock INTEGER NOT NULL,
            image_url TEXT NOT NULL
        )
    ''')

    # Create orders table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            order_date TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Pending',
            total REAL NOT NULL,
            shipping_name TEXT NOT NULL,
            shipping_address TEXT NOT NULL,
            shipping_city TEXT NOT NULL,
            shipping_zip TEXT NOT NULL,
            payment_method TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    ''')

    # Create order_items table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            price REAL NOT NULL,
            FOREIGN KEY(order_id) REFERENCES orders(id),
            FOREIGN KEY(product_id) REFERENCES products(id)
        )
    ''')

    # Create carts table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS carts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
    ''')

    # Create cart_items table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS cart_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cart_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            FOREIGN KEY(cart_id) REFERENCES carts(id),
            FOREIGN KEY(product_id) REFERENCES products(id),
            UNIQUE(cart_id, product_id)
        )
    ''')

    # Add indexes for foreign keys
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_carts_user_id ON carts(user_id)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id)')

    # Create wishlists table
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
    seed_data(conn)
    conn.close()

def seed_data(conn):
    cursor = conn.cursor()

    # Check if products already exist
    cursor.execute("SELECT COUNT(*) FROM products")
    if cursor.fetchone()[0] == 0:
        products = [
            ("Goku Ultra Instinct Figure", "Premium 1/8 scale painted Goku action figure in full Ultra Instinct glow. Crafted with durable vinyl and includes a custom light-up stand.", 7499.00, "Figures", 15, "/static/images/goku_ui.png"),
            ("Cyberpunk Neon Hoodie", "Heavyweight ultra-soft fleece hoodie featuring bright cyberpunk-style typography and glowing UV-reactive graphics on back and sleeves.", 4999.00, "Apparel", 30, "/static/images/neon_hoodie.png"),
            ("Demon Slayer Katana Replica", "High-fidelity replica of Tanjiro's pitch-black Nichirin blade. Made of high-grade carbon steel with matching custom display stand.", 10999.00, "Accessories", 5, "/static/images/katana.png"),
            ("Retro Anime Mech Poster", "Large holographic-finish metal print featuring an 80s aesthetic combat mech standing in front of a neon-cyberpunk Tokyo skyline.", 1699.00, "Posters", 100, "/static/images/mech_poster.png"),
            ("Chibi Naruto Keyring", "Cute micro-acrylic double-sided keyring of Naruto in Sage Mode with metallic gold clasp. Ideal for bags or keys.", 899.00, "Accessories", 50, "/static/images/keyring.png"),
            ("Neon Genesis EVA-01 Figure", "Highly articulated Evangelion Unit-01 collectors edition figure. Includes palette rifle, progressive knife, and custom base.", 12499.00, "Figures", 8, "/static/images/eva01.png"),
            ("Holographic Cyber-Senshi Tee", "Super-premium ring-spun cotton t-shirt with holographic anime character print that changes colors in shifting light.", 2499.00, "Apparel", 40, "/static/images/cyber_tee.png"),
            ("Aesthetic Sunset Mousepad", "Desk-mat size gaming mousepad with ultra-smooth fabric surface, rubberized backing, and neon retro sunset synthwave print.", 2099.00, "Accessories", 25, "/static/images/mousepad.png")
        ]
        cursor.executemany("INSERT INTO products (name, description, price, category, stock, image_url) VALUES (?, ?, ?, ?, ?, ?)", products)

    # Check if admin and standard users exist, if not seed them
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        # Create hashed passwords
        admin_pass = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode('utf-8')
        user_pass = bcrypt.hashpw(b"user123", bcrypt.gensalt()).decode('utf-8')

        cursor.execute("INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
                       ("admin", "admin@senpaisupply.com", admin_pass, "admin"))
        cursor.execute("INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
                       ("otaku", "otaku@senpaisupply.com", user_pass, "user"))

    conn.commit()

# User helpers
def register_user(username, email, password):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        cursor.execute("INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
                       (username, email, password_hash, "user"))
        conn.commit()
        user_id = cursor.lastrowid
        return {"success": True, "user": {"id": user_id, "username": username, "email": email, "role": "user"}}
    except sqlite3.IntegrityError as e:
        if "username" in str(e):
            return {"success": False, "error": "Username already exists"}
        elif "email" in str(e):
            return {"success": False, "error": "Email already exists"}
        return {"success": False, "error": "User registration failed"}
    finally:
        conn.close()

def login_user(email, password):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
    user = cursor.fetchone()
    conn.close()

    if user and bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
        return {
            "success": True,
            "user": {
                "id": user['id'],
                "username": user['username'],
                "email": user['email'],
                "role": user['role']
            }
        }
    return {"success": False, "error": "Invalid email or password"}

def get_user_by_id(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, email, role FROM users WHERE id = ?", (user_id,))
    user = cursor.fetchone()
    conn.close()
    if user:
        return dict(user)
    return None

# Product CRUD helpers
def get_products(category=None, search=None, sort_by=None, page=1, limit=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Base query
    query = "SELECT * FROM products WHERE 1=1"
    count_query = "SELECT COUNT(*) FROM products WHERE 1=1"
    params = []

    if category:
        query += " AND category = ?"
        count_query += " AND category = ?"
        params.append(category)
    if search:
        query += " AND (name LIKE ? OR description LIKE ?)"
        count_query += " AND (name LIKE ? OR description LIKE ?)"
        params.append(f"%{search}%")
        params.append(f"%{search}%")

    if sort_by == 'price_asc':
        query += " ORDER BY price ASC"
    elif sort_by == 'price_desc':
        query += " ORDER BY price DESC"
    else:
        query += " ORDER BY id DESC"
        
    # Get total count before limiting
    cursor.execute(count_query, params)
    total_count = cursor.fetchone()[0]

    # Add pagination
    if limit:
        offset = (page - 1) * limit
        query += " LIMIT ? OFFSET ?"
        params.append(limit)
        params.append(offset)

    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    return {
        "products": [dict(row) for row in rows],
        "total": total_count,
        "page": page,
        "limit": limit
    }

def get_product_by_id(product_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def add_product(name, description, price, category, stock, image_url):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO products (name, description, price, category, stock, image_url) VALUES (?, ?, ?, ?, ?, ?)",
        (name, description, price, category, stock, image_url)
    )
    conn.commit()
    product_id = cursor.lastrowid
    conn.close()
    return product_id

def update_product(product_id, name, description, price, category, stock, image_url):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE products SET name = ?, description = ?, price = ?, category = ?, stock = ?, image_url = ? WHERE id = ?",
        (name, description, price, category, stock, image_url, product_id)
    )
    conn.commit()
    rows_affected = cursor.rowcount
    conn.close()
    return rows_affected > 0

def delete_product(product_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM products WHERE id = ?", (product_id,))
    conn.commit()
    rows_affected = cursor.rowcount
    conn.close()
    return rows_affected > 0

# Order helpers
def create_order(user_id, items, shipping_name, shipping_address, shipping_city, shipping_zip, payment_method, total):
    conn = get_db_connection()
    cursor = conn.cursor()
    import datetime
    
    try:
        # Start transaction
        cursor.execute("BEGIN TRANSACTION")

        # Check stock first and update stock
        for item in items:
            cursor.execute("SELECT name, stock FROM products WHERE id = ?", (item['product_id'],))
            product = cursor.fetchone()
            if not product:
                raise Exception(f"Product ID {item['product_id']} not found")
            if product['stock'] < item['quantity']:
                raise Exception(f"Insufficient stock for '{product['name']}'. Available: {product['stock']}")

            new_stock = product['stock'] - item['quantity']
            cursor.execute("UPDATE products SET stock = ? WHERE id = ?", (new_stock, item['product_id']))

        order_date = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute(
            "INSERT INTO orders (user_id, order_date, status, total, shipping_name, shipping_address, shipping_city, shipping_zip, payment_method) VALUES (?, ?, 'Pending', ?, ?, ?, ?, ?, ?)",
            (user_id, order_date, total, shipping_name, shipping_address, shipping_city, shipping_zip, payment_method)
        )
        order_id = cursor.lastrowid

        for item in items:
            cursor.execute(
                "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
                (order_id, item['product_id'], item['quantity'], item['price'])
            )

        conn.commit()
        return {"success": True, "order_id": order_id}
    except Exception as e:
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        conn.close()

def get_orders(user_id=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if user_id:
        cursor.execute("""
            SELECT o.*, u.username 
            FROM orders o 
            JOIN users u ON o.user_id = u.id 
            WHERE o.user_id = ? 
            ORDER BY o.id DESC
        """, (user_id,))
    else:
        cursor.execute("""
            SELECT o.*, u.username 
            FROM orders o 
            JOIN users u ON o.user_id = u.id 
            ORDER BY o.id DESC
        """)
        
    orders = [dict(row) for row in cursor.fetchall()]
    
    for order in orders:
        cursor.execute("""
            SELECT oi.*, p.name as product_name, p.image_url 
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            WHERE oi.order_id = ?
        """, (order['id'],))
        order['items'] = [dict(row) for row in cursor.fetchall()]
        
    conn.close()
    return orders

def update_order_status(order_id, status):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE orders SET status = ? WHERE id = ?", (status, order_id))
    conn.commit()
    rows_affected = cursor.rowcount
    conn.close()
    return rows_affected > 0


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
