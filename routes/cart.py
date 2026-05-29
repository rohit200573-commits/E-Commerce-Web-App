from flask import Blueprint, request, jsonify
import database
from utils import token_required

cart_bp = Blueprint('cart', __name__, url_prefix='/api/cart')

@cart_bp.route('', methods=['GET'])
@token_required
def get_cart(current_user):
    items = database.get_cart_items(current_user['id'])
    return jsonify({'items': items})

@cart_bp.route('', methods=['POST'])
@token_required
def add_item(current_user):
    data = request.get_json()
    product_id = data.get('product_id')
    quantity = data.get('quantity', 1)
    
    if not product_id:
        return jsonify({'message': 'Product ID is required'}), 400
        
    database.update_cart_item(current_user['id'], product_id, quantity)
    return jsonify({'message': 'Item added to cart'})

@cart_bp.route('/<int:product_id>', methods=['PUT'])
@token_required
def update_item(current_user, product_id):
    data = request.get_json()
    quantity = data.get('quantity')
    
    if quantity is None:
        return jsonify({'message': 'Quantity is required'}), 400
        
    database.update_cart_item(current_user['id'], product_id, quantity)
    return jsonify({'message': 'Cart updated'})

@cart_bp.route('/<int:product_id>', methods=['DELETE'])
@token_required
def remove_item(current_user, product_id):
    database.update_cart_item(current_user['id'], product_id, 0)
    return jsonify({'message': 'Item removed from cart'})

@cart_bp.route('/sync', methods=['POST'])
@token_required
def sync_cart(current_user):
    data = request.get_json()
    local_items = data.get('items', [])
    
    # Merge strategy: Update local items into DB cart.
    for item in local_items:
        # We don't overwrite if it already exists to keep it simple, or we can just append
        # Let's just add the quantity if they sync. But actually update is safer if it's an exact quantity.
        database.update_cart_item(current_user['id'], item['product_id'], item['quantity'])
        
    items = database.get_cart_items(current_user['id'])
    return jsonify({'message': 'Cart synced', 'items': items})
