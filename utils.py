from flask import request, jsonify, current_app
from functools import wraps
import jwt
import database
from markupsafe import escape
import time
from collections import defaultdict

auth_attempts = defaultdict(list)

def rate_limit(limit=5, period=60):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            ip = request.remote_addr
            now = time.time()
            auth_attempts[ip] = [t for t in auth_attempts[ip] if now - t < period]
            if len(auth_attempts[ip]) >= limit:
                return jsonify({'message': 'Too many authentication attempts. Please try again later.'}), 429
            auth_attempts[ip].append(now)
            return f(*args, **kwargs)
        return decorated
    return decorator

def sanitize_input(value):
    if isinstance(value, str):
        return str(escape(value.strip()))
    return value

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.cookies.get('jwt_token')
        
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
            
        try:
            data = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = database.get_user_by_id(data['user_id'])
            if not current_user:
                return jsonify({'message': 'User not found'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Token is invalid'}), 401
            
        return f(current_user, *args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(current_user, *args, **kwargs):
        if current_user['role'] != 'admin':
            return jsonify({'message': 'Admin privilege required'}), 403
        return f(current_user, *args, **kwargs)
    return token_required(decorated)
