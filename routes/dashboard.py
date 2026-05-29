from flask import Blueprint, request, jsonify
import database
from utils import token_required, admin_required

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')

@dashboard_bp.route('/stats', methods=['GET'])
@admin_required
def get_stats(current_user):
    conn = database.get_db_connection()
    cursor = conn.cursor()
    
    # 1. Total sales revenue
    cursor.execute("SELECT SUM(total) FROM orders WHERE status != 'Cancelled'")
    total_sales = cursor.fetchone()[0] or 0.0
    
    # 2. Total orders count
    cursor.execute("SELECT COUNT(*) FROM orders")
    total_orders = cursor.fetchone()[0] or 0
    
    # 3. Total products count
    cursor.execute("SELECT COUNT(*) FROM products")
    total_products = cursor.fetchone()[0] or 0
    
    # 4. Total users count
    cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'user'")
    total_users = cursor.fetchone()[0] or 0
    
    # 5. Sales by Category
    cursor.execute("""
        SELECT p.category, SUM(oi.quantity * oi.price) as revenue
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.status != 'Cancelled'
        GROUP BY p.category
    """)
    category_sales = [dict(row) for row in cursor.fetchall()]
    
    # 6. Recent Orders
    cursor.execute("""
        SELECT o.id, o.order_date, o.total, o.status, u.username
        FROM orders o
        JOIN users u ON o.user_id = u.id
        ORDER BY o.id DESC LIMIT 5
    """)
    recent_orders = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    
    return jsonify({
        'stats': {
            'total_sales': round(total_sales, 2),
            'total_orders': total_orders,
            'total_products': total_products,
            'total_users': total_users,
            'category_sales': category_sales,
            'recent_orders': recent_orders
        }
    })
