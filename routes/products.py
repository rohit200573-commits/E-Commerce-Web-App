from flask import Blueprint, request, jsonify
import database
from utils import sanitize_input, admin_required

products_bp = Blueprint('products', __name__, url_prefix='/api/products')

@products_bp.route('', methods=['GET'])
def list_products():
    category = request.args.get('category')
    search = request.args.get('search')
    sort_by = request.args.get('sort_by')
    
    try:
        page = int(request.args.get('page', 1))
        limit = request.args.get('limit')
        if limit is not None:
            limit = int(limit)
    except ValueError:
        page = 1
        limit = None
    
    result = database.get_products(category=category, search=search, sort_by=sort_by, page=page, limit=limit)
    return jsonify(result)

@products_bp.route('/<int:product_id>', methods=['GET'])
def get_product(product_id):
    product = database.get_product_by_id(product_id)
    if product:
        return jsonify({'product': product})
    return jsonify({'message': 'Product not found'}), 404

@products_bp.route('', methods=['POST'])
@admin_required
def add_new_product(current_user):
    data = request.get_json()
    if not data or not data.get('name') or not data.get('price') or not data.get('category') or data.get('stock') is None:
        return jsonify({'message': 'Missing required fields'}), 400
        
    image_url = data.get('image_url', '/static/images/placeholder.png')
    name = sanitize_input(data['name'])
    description = sanitize_input(data.get('description', ''))
    category = sanitize_input(data['category'])
    
    product_id = database.add_product(
        name,
        description,
        float(data['price']),
        category,
        int(data['stock']),
        image_url
    )
    
    new_product = database.get_product_by_id(product_id)
    return jsonify({
        'message': 'Product added successfully',
        'product': new_product
    }), 201

@products_bp.route('/<int:product_id>', methods=['PUT'])
@admin_required
def edit_product(current_user, product_id):
    data = request.get_json()
    product = database.get_product_by_id(product_id)
    if not product:
        return jsonify({'message': 'Product not found'}), 404
        
    name = sanitize_input(data.get('name', product['name']))
    description = sanitize_input(data.get('description', product['description']))
    price = data.get('price', product['price'])
    category = sanitize_input(data.get('category', product['category']))
    stock = data.get('stock', product['stock'])
    image_url = data.get('image_url', product['image_url'])
    
    success = database.update_product(
        product_id, name, description, float(price), category, int(stock), image_url
    )
    
    if success:
        updated_product = database.get_product_by_id(product_id)
        return jsonify({
            'message': 'Product updated successfully',
            'product': updated_product
        })
    return jsonify({'message': 'Update failed'}), 500

@products_bp.route('/<int:product_id>', methods=['DELETE'])
@admin_required
def delete_product(current_user, product_id):
    product = database.get_product_by_id(product_id)
    if not product:
        return jsonify({'message': 'Product not found'}), 404
        
    if database.delete_product(product_id):
        return jsonify({'message': 'Product deleted successfully'})
    return jsonify({'message': 'Failed to delete product'}), 500
