from flask import Blueprint, request, jsonify
import database
from utils import token_required, admin_required

orders_bp = Blueprint('orders', __name__, url_prefix='/api/orders')

@orders_bp.route('', methods=['POST'])
@token_required
def place_order(current_user):
    data = request.get_json()
    if not data or not data.get('items') or not data.get('shipping_details') or not data.get('payment_method') or data.get('total') is None:
        return jsonify({'message': 'Missing checkout information'}), 400
        
    shipping = data['shipping_details']
    if not shipping.get('name') or not shipping.get('address') or not shipping.get('city') or not shipping.get('zip'):
        return jsonify({'message': 'Missing shipping fields'}), 400
        
    result = database.create_order(
        current_user['id'],
        data['items'],
        shipping['name'],
        shipping['address'],
        shipping['city'],
        shipping['zip'],
        data['payment_method'],
        float(data['total'])
    )
    
    if result['success']:
        # Clear database cart on successful order
        database.clear_cart(current_user['id'])
        return jsonify({
            'message': 'Order placed successfully',
            'order_id': result['order_id']
        }), 201
    else:
        return jsonify({'message': result['error']}), 400

@orders_bp.route('', methods=['GET'])
@token_required
def list_orders(current_user):
    if current_user['role'] == 'admin':
        orders = database.get_orders()  # Admin sees all orders
    else:
        orders = database.get_orders(user_id=current_user['id'])  # User sees only their orders
    return jsonify({'orders': orders})

@orders_bp.route('/<int:order_id>/status', methods=['PUT'])
@admin_required
def update_order_status(current_user, order_id):
    data = request.get_json()
    if not data or not data.get('status'):
        return jsonify({'message': 'Missing status field'}), 400
        
    status = data['status']
    if status not in ['Pending', 'Shipped', 'Delivered']:
        return jsonify({'message': 'Invalid status'}), 400
        
    success = database.update_order_status(order_id, status)
    if success:
        return jsonify({'message': f'Order status updated to {status}'})
    return jsonify({'message': 'Order not found or update failed'}), 404
