/* ==========================================================================
   Chronos Timepieces API Client Layer
   ========================================================================== */

const API_BASE_URL = window.location.origin;

class APIClient {
    constructor() {
        this.tokenKey = "chronos_jwt_token";
    }

    // Auth Token Management
    setToken(token) {
        localStorage.setItem(this.tokenKey, token);
        // Dispatch event for other modules to know auth state changed
        window.dispatchEvent(new Event("authChange"));
    }

    getToken() {
        return localStorage.getItem(this.tokenKey);
    }

    logout() {
        localStorage.removeItem(this.tokenKey);
        window.dispatchEvent(new Event("authChange"));
    }

    isAuthenticated() {
        return !!this.getToken();
    }

    // Check JWT payload expiration
    isTokenExpired() {
        const token = this.getToken();
        if (!token) return true;
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            
            const payload = JSON.parse(jsonPayload);
            if (payload.exp) {
                const currentEpoch = Math.floor(Date.now() / 1000);
                return payload.exp < currentEpoch;
            }
            return false;
        } catch (e) {
            return true;
        }
    }

    // Common Fetch Wrapper
    async request(endpoint, options = {}) {
        // If token exists and is expired, log user out
        if (this.isAuthenticated() && this.isTokenExpired()) {
            this.logout();
            window.dispatchEvent(new CustomEvent("toast", {
                detail: { message: "Session expired. Please sign in again.", type: "warning" }
            }));
            throw new Error("Session expired");
        }

        const url = `${API_BASE_URL}${endpoint}`;
        
        // Setup headers
        const headers = new Headers(options.headers || {});
        headers.append("Accept", "application/json");
        
        // Auto-inject token
        const token = this.getToken();
        if (token) {
            headers.append("Authorization", `Bearer ${token}`);
        }

        // Set content type if JSON content is sent
        if (options.body && !(options.body instanceof FormData) && typeof options.body === 'object') {
            headers.append("Content-Type", "application/json");
            options.body = JSON.stringify(options.body);
        }

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(url, config);
            
            // Handle 204 No Content
            if (response.status === 204) {
                return null;
            }
            
            const data = await response.json().catch(() => ({}));
            
            if (!response.ok) {
                const errorMsg = data.detail || response.statusText || "Request failed";
                throw { status: response.status, message: errorMsg };
            }
            
            return data;
        } catch (error) {
            console.error("API Call error:", error);
            // If it's already structured, rethrow
            if (error.status && error.message) {
                throw error;
            }
            throw { status: 500, message: "Network error. Please try again." };
        }
    }

    // Auth APIs
    async signup(username, email, password) {
        const data = await this.request("/api/auth/signup", {
            method: "POST",
            body: { username, email, password }
        });
        return data;
    }

    async login(email, password) {
        const data = await this.request("/api/auth/login", {
            method: "POST",
            body: { email, password }
        });
        if (data && data.access_token) {
            this.setToken(data.access_token);
        }
        return data;
    }

    async getMe() {
        return await this.request("/api/auth/me");
    }

    // Product APIs
    async getProducts(params = {}) {
        const queryParts = [];
        if (params.category && params.category !== "all") {
            queryParts.push(`category=${encodeURIComponent(params.category)}`);
        }
        if (params.search) {
            queryParts.push(`search=${encodeURIComponent(params.search)}`);
        }
        
        const queryString = queryParts.length ? `?${queryParts.join("&")}` : "";
        return await this.request(`/api/products${queryString}`);
    }

    async getProduct(productId) {
        return await this.request(`/api/products/${productId}`);
    }

    async createProduct(productData) {
        return await this.request("/api/products", {
            method: "POST",
            body: productData
        });
    }

    async updateProduct(productId, productData) {
        return await this.request(`/api/products/${productId}`, {
            method: "PUT",
            body: productData
        });
    }

    async deleteProduct(productId) {
        return await this.request(`/api/products/${productId}`, {
            method: "DELETE"
        });
    }

    // Order APIs
    async createOrder(shippingAddress, items) {
        return await this.request("/api/orders", {
            method: "POST",
            body: {
                shipping_address: shippingAddress,
                items: items.map(item => ({
                    product_id: item.productId,
                    quantity: item.quantity
                }))
            }
        });
    }

    async getMyOrders() {
        return await this.request("/api/orders/my");
    }

    async getAllOrders() {
        return await this.request("/api/orders");
    }

    async updateOrderStatus(orderId, status) {
        return await this.request(`/api/orders/${orderId}`, {
            method: "PATCH",
            body: { status }
        });
    }
}

// Global Client instance
const api = new APIClient();
window.apiClient = api;
