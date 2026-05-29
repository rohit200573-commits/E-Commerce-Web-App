/* ==========================================================================
   SENPAISUPPLY API CLIENT Wrapper
   ========================================================================== */

const API = {
    // Authenticated Request Wrapper
    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        const config = {
            ...options,
            headers,
            credentials: 'same-origin' // Ensures HttpOnly cookies are sent
        };

        try {
            const response = await fetch(endpoint, config);
            
            // Auto logout on unauthorized
            if (response.status === 401) {
                localStorage.removeItem('senpai_user');
                window.dispatchEvent(new Event('auth-status-changed'));
                showToast("Your session has expired. Please log in again.", "error");
                window.location.hash = "#/auth";
            }
            
            const data = await response.getReader ? null : await response.json().catch(() => ({}));
            
            if (!response.ok && response.status !== 401) {
                throw new Error(data?.message || `API error: ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error(`Request to ${endpoint} failed:`, error);
            throw error;
        }
    },

    // Auth endpoints
    auth: {
        async register(username, email, password) {
            const data = await API.request('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify({ username, email, password })
            });
            if (data?.user) {
                localStorage.setItem('senpai_user', JSON.stringify(data.user));
                window.dispatchEvent(new Event('auth-status-changed'));
            }
            return data;
        },

        async login(email, password) {
            const data = await API.request('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            if (data?.user) {
                localStorage.setItem('senpai_user', JSON.stringify(data.user));
                window.dispatchEvent(new Event('auth-status-changed'));
            }
            return data;
        },

        async me() {
            try {
                const data = await API.request('/api/auth/me', { method: 'GET' });
                if (data?.user) {
                    localStorage.setItem('senpai_user', JSON.stringify(data.user));
                    return data.user;
                }
            } catch (e) {
                localStorage.removeItem('senpai_user');
                window.dispatchEvent(new Event('auth-status-changed'));
            }
            return null;
        },

        async logout() {
            await API.request('/api/auth/logout', { method: 'POST' });
            localStorage.removeItem('senpai_user');
            window.dispatchEvent(new Event('auth-status-changed'));
            showToast("Logged out successfully.", "success");
            window.location.hash = "#/";
        }
    },

    // Cart endpoints
    cart: {
        async get() {
            return await API.request('/api/cart', { method: 'GET' });
        },
        async add(product_id, quantity) {
            return await API.request('/api/cart', {
                method: 'POST',
                body: JSON.stringify({ product_id, quantity })
            });
        },
        async update(product_id, quantity) {
            return await API.request(`/api/cart/${product_id}`, {
                method: 'PUT',
                body: JSON.stringify({ quantity })
            });
        },
        async remove(product_id) {
            return await API.request(`/api/cart/${product_id}`, {
                method: 'DELETE'
            });
        },
        async sync(items) {
            return await API.request('/api/cart/sync', {
                method: 'POST',
                body: JSON.stringify({ items })
            });
        }
    },

    // Products endpoints
    products: {
        async list(filters = {}) {
            const queryParams = new URLSearchParams();
            if (filters.category && filters.category !== 'all') {
                queryParams.append('category', filters.category);
            }
            if (filters.search) {
                queryParams.append('search', filters.search);
            }
            if (filters.sort_by) {
                queryParams.append('sort_by', filters.sort_by);
            }
            
            const queryString = queryParams.toString();
            const endpoint = `/api/products${queryString ? '?' + queryString : ''}`;
            return await API.request(endpoint, { method: 'GET' });
        },

        async get(id) {
            return await API.request(`/api/products/${id}`, { method: 'GET' });
        },

        async create(productData) {
            return await API.request('/api/products', {
                method: 'POST',
                body: JSON.stringify(productData)
            });
        },

        async update(id, productData) {
            return await API.request(`/api/products/${id}`, {
                method: 'PUT',
                body: JSON.stringify(productData)
            });
        },

        async delete(id) {
            return await API.request(`/api/products/${id}`, {
                method: 'DELETE'
            });
        }
    },

    // Orders endpoints
    orders: {
        async create(orderData) {
            return await API.request('/api/orders', {
                method: 'POST',
                body: JSON.stringify(orderData)
            });
        },

        async list() {
            return await API.request('/api/orders', { method: 'GET' });
        },

        async updateStatus(id, status) {
            return await API.request(`/api/orders/${id}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status })
            });
        }
    },

    // Dashboard Statistics (Admin Only)
    admin: {
        async getStats() {
            return await API.request('/api/dashboard/stats', { method: 'GET' });
        }
    }
};

// Global Toast notification utility helper
function showToast(message, type = "success") {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconClass = "fas fa-check-circle";
    if (type === "error") iconClass = "fas fa-exclamation-circle";
    
    toast.innerHTML = `
        <i class="${iconClass}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Fade and slide out and remove toast
    setTimeout(() => {
        toast.style.transform = "translateX(120%)";
        toast.style.transition = "transform 0.3s ease-out";
        setTimeout(() => {
            container.removeChild(toast);
        }, 300);
    }, 4000);
}
window.showToast = showToast;
window.API = API;
