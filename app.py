import os
import secrets
from flask import Flask, render_template
import database
from routes import auth_bp, products_bp, orders_bp, dashboard_bp, cart_bp

app = Flask(__name__, static_folder='static', template_folder='templates')

# Secure Secret Key fallback with file persistence for multi-worker support
secret_key = os.environ.get('JWT_SECRET')
if not secret_key:
    secret_path = os.path.join(os.path.dirname(__file__), '.jwt_secret')
    if os.path.exists(secret_path):
        try:
            with open(secret_path, 'r') as f:
                secret_key = f.read().strip()
        except Exception:
            pass
    if not secret_key:
        secret_key = secrets.token_hex(32)
        try:
            with open(secret_path, 'w') as f:
                f.write(secret_key)
        except Exception as e:
            print(f"WARNING: Could not persist JWT secret key to file: {e}")
        print("WARNING: JWT_SECRET environment variable is missing. Generated and persisted a secure key for session consistency.")
app.config['SECRET_KEY'] = secret_key

@app.after_request
def add_header(r):
    r.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    r.headers["Pragma"] = "no-cache"
    r.headers["Expires"] = "0"
    return r

# Register Blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(products_bp)
app.register_blueprint(orders_bp)
app.register_blueprint(dashboard_bp)
app.register_blueprint(cart_bp)

from routes.wishlists import wishlist_bp
app.register_blueprint(wishlist_bp)

# Static Assets
@app.route('/')
def home():
    return render_template('index.html')

if __name__ == '__main__':
    # Initialize the database and load seed data if needed
    database.init_db()
    
    # Start Flask Server
    app.run(debug=True, host='0.0.0.0', port=5000)

