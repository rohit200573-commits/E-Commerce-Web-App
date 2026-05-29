from flask import Blueprint, request, jsonify, current_app, make_response
import datetime
import jwt
import database
from utils import sanitize_input, rate_limit, token_required

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/register', methods=['POST'])
@rate_limit(limit=10, period=60)
def register():
    data = request.get_json()
    if not data or not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Missing fields required'}), 400
        
    username = sanitize_input(data['username'])
    email = sanitize_input(data['email'])
        
    result = database.register_user(username, email, data['password'])
    if result['success']:
        token = jwt.encode({
            'user_id': result['user']['id'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, current_app.config['SECRET_KEY'], algorithm="HS256")
        
        resp = make_response(jsonify({
            'message': 'User registered successfully',
            'user': result['user']
        }), 201)
        resp.set_cookie('jwt_token', token, httponly=True, samesite='Strict', max_age=86400)
        return resp
    else:
        return jsonify({'message': result['error']}), 400

@auth_bp.route('/login', methods=['POST'])
@rate_limit(limit=10, period=60)
def login():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Missing email or password'}), 400
        
    result = database.login_user(data['email'], data['password'])
    if result['success']:
        token = jwt.encode({
            'user_id': result['user']['id'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, current_app.config['SECRET_KEY'], algorithm="HS256")
        
        resp = make_response(jsonify({
            'message': 'Login successful',
            'user': result['user']
        }), 200)
        resp.set_cookie('jwt_token', token, httponly=True, samesite='Strict', max_age=86400)
        return resp
    else:
        return jsonify({'message': result['error']}), 401

@auth_bp.route('/me', methods=['GET'])
@token_required
def get_me(current_user):
    return jsonify({'user': current_user})

@auth_bp.route('/logout', methods=['POST'])
def logout():
    resp = make_response(jsonify({'message': 'Logged out successfully'}))
    resp.set_cookie('jwt_token', '', expires=0, httponly=True, samesite='Strict')
    return resp
