from flask import Blueprint, request, jsonify
import database
from utils import token_required

wishlist_bp = Blueprint('wishlist', __name__, url_prefix='/api/wishlist')

@wishlist_bp.route('', methods=['GET'])
@token_required
def get_user_wishlist(current_user):
    items = database.get_wishlist(current_user['id'])
    return jsonify({'wishlist': items})

@wishlist_bp.route('/<int:product_id>', methods=['POST'])
@token_required
def add_item_to_wishlist(current_user, product_id):
    product = database.get_product_by_id(product_id)
    if not product:
        return jsonify({'message': 'Product not found'}), 404
        
    database.add_to_wishlist(current_user['id'], product_id)
    return jsonify({'message': 'Added to wishlist'})

@wishlist_bp.route('/<int:product_id>', methods=['DELETE'])
@token_required
def remove_item_from_wishlist(current_user, product_id):
    database.remove_from_wishlist(current_user['id'], product_id)
    return jsonify({'message': 'Removed from wishlist'})
