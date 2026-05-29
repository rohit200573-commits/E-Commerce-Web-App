/* ==========================================================================
   Chronos Timepieces Main Application Orchestrator
   ========================================================================== */

class ChronosApp {
    constructor() {
        this.state = {
            currentUser: null,
            products: [],
            cart: this.loadCartFromStorage(),
            currentView: "catalog",
            selectedCategory: "all",
            searchQuery: "",
            activeAdminTab: "orders"
        };
        
        this.init();
    }

    // --- State & Storage Helpers ---
    loadCartFromStorage() {
        try {
            const saved = localStorage.getItem("chronos_cart");
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    }

    saveCartToStorage() {
        localStorage.setItem("chronos_cart", JSON.stringify(this.state.cart));
    }

    // --- Toast System ---
    showToast(message, type = "success") {
        const container = document.getElementById("toast-container");
        if (!container) return;

        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;
        
        let icon = '';
        if (type === 'success') icon = '✓';
        else if (type === 'error') icon = '✕';
        else icon = '⚠';

        toast.innerHTML = `
            <div style="font-weight:700; font-size:1.1rem; color:var(--accent-gold);">${icon}</div>
            <span class="toast-message">${message}</span>
        `;
        
        container.appendChild(toast);
        
        // Trigger fade out
        setTimeout(() => {
            toast.classList.add("fade-out");
            toast.addEventListener("transitionend", () => {
                toast.remove();
            });
        }, 3500);
    }

    // --- View Navigation & Routing ---
    navigateTo(viewName) {
        // Auth Guards
        if ((viewName === "profile" || viewName === "checkout") && !api.isAuthenticated()) {
            this.showToast("Please sign in to continue.", "warning");
            this.navigateTo("auth");
            return;
        }

        if (viewName === "admin" && (!api.isAuthenticated() || !this.state.currentUser || this.state.currentUser.role !== "admin")) {
            this.showToast("Unauthorized. Admin credentials required.", "error");
            this.navigateTo("catalog");
            return;
        }

        this.state.currentView = viewName;
        
        // Toggle view sections
        const sections = document.querySelectorAll(".view-section");
        sections.forEach(sec => {
            sec.classList.remove("active");
            if (sec.id === `${viewName}-view`) {
                sec.classList.add("active");
            }
        });

        // Update Nav link styles
        const navLinks = document.querySelectorAll(".nav-link");
        navLinks.forEach(link => {
            link.classList.remove("active");
            if (link.getAttribute("data-view") === viewName) {
                link.classList.add("active");
            }
        });

        // Hide search bar on non-catalog views
        const searchContainer = document.querySelector(".search-bar-container");
        if (viewName === "catalog") {
            searchContainer.classList.remove("hidden");
        } else {
            searchContainer.classList.add("hidden");
        }

        // View-specific initialization
        if (viewName === "profile") {
            this.loadOrderHistory();
        } else if (viewName === "admin") {
            this.loadAdminPanel();
        } else if (viewName === "checkout") {
            this.setupCheckoutView();
        }

        // Scroll to top
        window.scrollTo(0, 0);
    }

    // --- Product Catalog loading ---
    async loadProducts() {
        const container = document.getElementById("products-container");
        if (!container) return;

        container.innerHTML = '<div class="loading-spinner"></div>';
        
        try {
            const products = await api.getProducts({
                category: this.state.selectedCategory,
                search: this.state.searchQuery
            });
            
            this.state.products = products;
            
            if (products.length === 0) {
                container.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 4rem; color: var(--text-secondary);">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:1rem; opacity:0.5;"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                        <p>No masterpieces found matching your request.</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = products.map(p => UIComponents.ProductCard(p)).join("");
            
        } catch (error) {
            this.showToast("Failed to fetch product catalog.", "error");
            container.innerHTML = `<p style="grid-column: 1/-1; text-align:center; color:red;">Error loading products: ${error.message}</p>`;
        }
    }

    // --- Cart Actions ---
    addToCart(productId) {
        const product = this.state.products.find(p => p.id === productId);
        if (!product) return;

        const cartItem = this.state.cart.find(item => item.id === productId);
        
        if (cartItem) {
            if (cartItem.quantity >= product.stock) {
                this.showToast(`Cannot add more. Only ${product.stock} items available in stock.`, "warning");
                return;
            }
            cartItem.quantity++;
        } else {
            this.state.cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                image_url: product.image_url,
                quantity: 1,
                maxStock: product.stock
            });
        }
        
        this.saveCartToStorage();
        this.updateCartUI();
        this.showToast(`"${product.name}" added to collection.`);
    }

    removeFromCart(productId) {
        this.state.cart = this.state.cart.filter(item => item.id !== productId);
        this.saveCartToStorage();
        this.updateCartUI();
        this.showToast("Item removed from collection.", "warning");
    }

    changeQuantity(productId, delta) {
        const item = this.state.cart.find(i => i.id === productId);
        if (!item) return;

        item.quantity += delta;
        
        if (item.quantity <= 0) {
            this.removeFromCart(productId);
            return;
        }

        if (item.quantity > item.maxStock) {
            this.showToast(`Only ${item.maxStock} pieces in stock.`, "warning");
            item.quantity = item.maxStock;
            return;
        }

        this.saveCartToStorage();
        this.updateCartUI();
    }

    updateCartUI() {
        const countBadge = document.querySelector(".cart-count");
        const itemsContainer = document.getElementById("cart-items-container");
        const subtotalVal = document.getElementById("cart-subtotal-val");
        const footer = document.getElementById("cart-footer");
        const emptyMsg = document.querySelector(".cart-empty-message");

        const totalItems = this.state.cart.reduce((sum, item) => sum + item.quantity, 0);
        countBadge.innerText = totalItems;
        
        if (this.state.cart.length === 0) {
            itemsContainer.innerHTML = '';
            if (emptyMsg) emptyMsg.classList.remove("hidden");
            if (footer) footer.classList.add("hidden");
            subtotalVal.innerText = "$0.00";
            return;
        }

        if (emptyMsg) emptyMsg.classList.add("hidden");
        if (footer) footer.classList.remove("hidden");

        itemsContainer.innerHTML = this.state.cart.map(item => UIComponents.CartItem(item)).join("");
        
        const subtotal = this.state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        subtotalVal.innerText = `$${subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    }

    // --- Order Checkout View ---
    setupCheckoutView() {
        const container = document.getElementById("checkout-items-container");
        const subtotalEl = document.getElementById("checkout-subtotal");
        const totalEl = document.getElementById("checkout-total");

        if (this.state.cart.length === 0) {
            this.navigateTo("catalog");
            this.showToast("Your cart is empty.", "warning");
            return;
        }

        container.innerHTML = this.state.cart.map(item => `
            <div class="checkout-item-row">
                <div class="checkout-item-meta">
                    <span class="checkout-item-title">${item.name}</span>
                    <span class="checkout-item-qty">Qty: ${item.quantity}</span>
                </div>
                <span class="checkout-item-price">$${(item.price * item.quantity).toLocaleString()}</span>
            </div>
        `).join("");

        const subtotal = this.state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        subtotalEl.innerText = `$${subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        totalEl.innerText = `$${subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    }

    async handleCheckout(event) {
        event.preventDefault();
        const address = document.getElementById("checkout-address").value;
        
        if (!address || address.trim().length < 5) {
            this.showToast("Please enter a valid shipping address.", "warning");
            return;
        }

        try {
            const checkoutItems = this.state.cart.map(item => ({
                productId: item.id,
                quantity: item.quantity
            }));

            const order = await api.createOrder(address, checkoutItems);
            
            this.showToast("Order placed successfully!", "success");
            
            // Clear cart
            this.state.cart = [];
            this.saveCartToStorage();
            this.updateCartUI();

            // Redirect to Profile tab to trace shipping status
            this.navigateTo("profile");
            
        } catch (error) {
            this.showToast(error.message || "Checkout failed. Please try again.", "error");
        }
    }

    // --- Customer Order History ---
    async loadOrderHistory() {
        const container = document.getElementById("orders-list-container");
        if (!container) return;

        container.innerHTML = '<div class="loading-spinner"></div>';

        try {
            const orders = await api.getMyOrders();
            
            if (orders.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                        <p>No orders placed yet. Add items to your collection to get started.</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = orders.map(o => UIComponents.OrderCard(o)).join("");
            
        } catch (error) {
            this.showToast("Failed to fetch order history.", "error");
            container.innerHTML = `<p style="color:red; text-align:center;">Error loading orders: ${error.message}</p>`;
        }
    }

    // --- Admin Dashboard logic ---
    async loadAdminPanel() {
        const ordersTab = document.getElementById("admin-orders-tab");
        const productsTab = document.getElementById("admin-products-tab");
        const dashboardTab = document.getElementById("admin-dashboard-tab");

        // Toggle visibility
        ordersTab.classList.remove("active");
        productsTab.classList.remove("active");
        dashboardTab.classList.remove("active");

        if (this.state.activeAdminTab === "orders") {
            ordersTab.classList.add("active");
            await this.loadAdminOrders();
        } else if (this.state.activeAdminTab === "products") {
            productsTab.classList.add("active");
            await this.loadAdminProducts();
        } else if (this.state.activeAdminTab === "dashboard") {
            dashboardTab.classList.add("active");
            await this.loadAdminDashboard();
        }
    }

    async loadAdminOrders() {
        const tbody = document.getElementById("admin-orders-tbody");
        tbody.innerHTML = '<tr><td colspan="7"><div class="loading-spinner" style="margin:2rem auto;"></div></td></tr>';

        try {
            const orders = await api.getAllOrders();
            if (orders.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:var(--text-secondary);">No customer orders found.</td></tr>';
                return;
            }
            
            tbody.innerHTML = orders.map(o => UIComponents.AdminOrderRow(o)).join("");
            
            // Add listeners for status update
            tbody.querySelectorAll(".admin-update-status-btn").forEach(btn => {
                btn.addEventListener("click", async (e) => {
                    const id = btn.getAttribute("data-id");
                    const select = tbody.querySelector(`.admin-status-select[data-id="${id}"]`);
                    const status = select.value;
                    
                    try {
                        await api.updateOrderStatus(id, status);
                        this.showToast(`Order #${id} status updated to ${status}.`);
                        this.loadAdminOrders();
                    } catch (err) {
                        this.showToast(err.message, "error");
                    }
                });
            });

        } catch (error) {
            this.showToast("Failed to fetch customer orders.", "error");
        }
    }

    async loadAdminProducts() {
        const tbody = document.getElementById("admin-products-tbody");
        tbody.innerHTML = '<tr><td colspan="5"><div class="loading-spinner" style="margin:2rem auto;"></div></td></tr>';

        try {
            const products = await api.getProducts();
            if (products.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-secondary);">No products in catalog.</td></tr>';
                return;
            }

            tbody.innerHTML = products.map(p => UIComponents.AdminProductRow(p)).join("");

            // Add edit listeners
            tbody.querySelectorAll(".admin-edit-prod-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    const id = parseInt(btn.getAttribute("data-id"));
                    const product = products.find(p => p.id === id);
                    if (product) this.openProductFormModal(product);
                });
            });

            // Add delete listeners
            tbody.querySelectorAll(".admin-delete-prod-btn").forEach(btn => {
                btn.addEventListener("click", async () => {
                    const id = btn.getAttribute("data-id");
                    if (confirm(`Are you sure you want to remove watch ID #${id}?`)) {
                        try {
                            await api.deleteProduct(id);
                            this.showToast("Watch deleted successfully.", "warning");
                            this.loadAdminProducts();
                            this.loadProducts(); // Sync catalog
                        } catch (err) {
                            this.showToast(err.message, "error");
                        }
                    }
                });
            });

        } catch (error) {
            this.showToast("Failed to fetch catalog inventory.", "error");
        }
    }

    async loadAdminDashboard() {
        const chartContainer = document.getElementById("dashboard-chart-container");
        chartContainer.innerHTML = '<div class="loading-spinner" style="margin:2rem auto;"></div>';

        try {
            const orders = await api.getAllOrders();
            const chartHtml = UIComponents.AnalyticsDashboard(orders);
            chartContainer.innerHTML = chartHtml;
        } catch (error) {
            this.showToast("Failed to load sales analytics dashboard.", "error");
        }
    }

    openProductFormModal(product = null) {
        const modal = document.getElementById("product-form-modal");
        const title = document.getElementById("product-form-title");
        const submitBtn = document.getElementById("form-submit-btn");

        // Clear/Set values
        document.getElementById("form-product-id").value = product ? product.id : "";
        document.getElementById("form-product-name").value = product ? product.name : "";
        document.getElementById("form-product-category").value = product ? product.category : "Figures";
        document.getElementById("form-product-price").value = product ? product.price : "";
        document.getElementById("form-product-stock").value = product ? product.stock : "";
        document.getElementById("form-product-image").value = product ? product.image_url : "assets/items/";
        document.getElementById("form-product-desc").value = product ? product.description : "";

        title.innerText = product ? "Modify Item" : "Exhibit New Item";
        submitBtn.innerText = product ? "Update Item" : "Publish to Catalog";

        modal.classList.add("active");
    }

    closeProductFormModal() {
        document.getElementById("product-form-modal").classList.remove("active");
    }

    async handleProductFormSubmit(event) {
        event.preventDefault();
        
        const id = document.getElementById("form-product-id").value;
        const productData = {
            name: document.getElementById("form-product-name").value,
            category: document.getElementById("form-product-category").value,
            price: parseFloat(document.getElementById("form-product-price").value),
            stock: parseInt(document.getElementById("form-product-stock").value),
            image_url: document.getElementById("form-product-image").value,
            description: document.getElementById("form-product-desc").value
        };

        try {
            if (id) {
                // Update
                await api.updateProduct(id, productData);
                this.showToast("Watch specifications updated.");
            } else {
                // Create
                await api.createProduct(productData);
                this.showToast("New timepiece added to the collection!");
            }
            this.closeProductFormModal();
            this.loadAdminProducts();
            this.loadProducts(); // Sync catalog
        } catch (error) {
            this.showToast(error.message, "error");
        }
    }

    // --- Modal Detailed View ---
    async openProductDetailsModal(productId) {
        const modal = document.getElementById("product-modal");
        const container = document.getElementById("modal-content-container");
        
        container.innerHTML = '<div class="loading-spinner"></div>';
        modal.classList.add("active");

        try {
            const product = await api.getProduct(productId);
            container.innerHTML = UIComponents.ProductDetailModal(product);
            
            // Add listener inside modal
            const addToCartBtn = container.querySelector(".modal-add-to-cart-btn");
            if (addToCartBtn) {
                addToCartBtn.addEventListener("click", () => {
                    this.addToCart(product.id);
                    modal.classList.remove("active");
                });
            }
        } catch (error) {
            this.showToast("Failed to retrieve watch details.", "error");
            modal.classList.remove("active");
        }
    }

    // --- Auth Form Management & Login Flow ---
    async handleLogin(event) {
        event.preventDefault();
        const email = document.getElementById("login-email").value;
        const password = document.getElementById("login-password").value;

        try {
            await api.login(email, password);
            this.showToast("Welcome back to Chronos.", "success");
            this.navigateTo("catalog");
        } catch (error) {
            this.showToast(error.message || "Invalid credentials.", "error");
        }
    }

    async handleSignup(event) {
        event.preventDefault();
        const username = document.getElementById("signup-username").value;
        const email = document.getElementById("signup-email").value;
        const password = document.getElementById("signup-password").value;

        try {
            await api.signup(username, email, password);
            this.showToast("Account created successfully. Please sign in.", "success");
            // Switch card to login
            document.getElementById("signup-card").classList.remove("active");
            document.getElementById("login-card").classList.add("active");
            
            // Prefill email
            document.getElementById("login-email").value = email;
            document.getElementById("login-password").focus();
        } catch (error) {
            this.showToast(error.message || "Registration failed.", "error");
        }
    }

    async checkAuthStatus() {
        const headerBtn = document.getElementById("auth-header-btn");
        const logoutBtn = document.getElementById("logout-btn");
        const adminLink = document.getElementById("nav-admin");
        
        if (api.isAuthenticated()) {
            try {
                const user = await api.getMe();
                this.state.currentUser = user;
                
                // Update UI for logged-in state
                headerBtn.innerHTML = `<span>${user.username}</span>`;
                headerBtn.classList.remove("btn-primary");
                headerBtn.classList.add("btn-text");
                // Disable clicking header button since user is logged in (they can log out via logout button)
                headerBtn.style.pointerEvents = "none";
                logoutBtn.classList.remove("hidden");

                // Update profile card
                const pUser = document.getElementById("profile-username");
                const pEmail = document.getElementById("profile-email");
                const pRole = document.getElementById("profile-role");
                if (pUser) pUser.innerText = user.username;
                if (pEmail) pEmail.innerText = user.email;
                if (pRole) {
                    pRole.innerText = user.role === "admin" ? "Grand Curator (Admin)" : "Collector";
                    pRole.className = `profile-badge ${user.role === 'admin' ? 'admin-badge' : 'user-badge'}`;
                }

                // Show Admin panel if role is admin
                if (user.role === "admin") {
                    adminLink.classList.remove("hidden");
                } else {
                    adminLink.classList.add("hidden");
                    if (this.state.currentView === "admin") {
                        this.navigateTo("catalog");
                    }
                }

            } catch (err) {
                // If fetching user fails, token might be invalid
                api.logout();
            }
        } else {
            // Logged out UI
            this.state.currentUser = null;
            headerBtn.innerHTML = `<span>Log In</span>`;
            headerBtn.classList.remove("btn-text");
            headerBtn.classList.add("btn-primary");
            headerBtn.style.pointerEvents = "auto";
            logoutBtn.classList.add("hidden");
            adminLink.classList.add("hidden");
            
            if (this.state.currentView === "profile" || this.state.currentView === "admin" || this.state.currentView === "checkout") {
                this.navigateTo("catalog");
            }
        }
    }

    // --- Init Application ---
    async init() {
        // Bind UI Event Listeners
        this.bindEvents();
        
        // Load products
        await this.loadProducts();
        
        // Update cart list
        this.updateCartUI();

        // Check Auth
        await this.checkAuthStatus();
        
        // Setup initial view
        this.navigateTo("catalog");
    }

    bindEvents() {
        // Navigation View clicks
        document.querySelectorAll("[data-view]").forEach(elem => {
            elem.addEventListener("click", (e) => {
                e.preventDefault();
                const view = elem.getAttribute("data-view");
                this.navigateTo(view);
            });
        });

        document.getElementById("logo-btn").addEventListener("click", () => {
            this.navigateTo("catalog");
        });

        // Header Auth button
        document.getElementById("auth-header-btn").addEventListener("click", () => {
            if (!api.isAuthenticated()) {
                this.navigateTo("auth");
            }
        });

        // Logout click
        document.getElementById("logout-btn").addEventListener("click", () => {
            api.logout();
            this.showToast("Signed out successfully.", "warning");
        });

        // Auth switches
        document.getElementById("go-to-signup").addEventListener("click", (e) => {
            e.preventDefault();
            document.getElementById("login-card").classList.remove("active");
            document.getElementById("signup-card").classList.add("active");
        });

        document.getElementById("go-to-login").addEventListener("click", (e) => {
            e.preventDefault();
            document.getElementById("signup-card").classList.remove("active");
            document.getElementById("login-card").classList.add("active");
        });

        // Auth Form submits
        document.getElementById("login-form").addEventListener("submit", (e) => this.handleLogin(e));
        document.getElementById("signup-form").addEventListener("submit", (e) => this.handleSignup(e));

        // Checkout submit & cancel
        document.getElementById("checkout-form").addEventListener("submit", (e) => this.handleCheckout(e));
        document.getElementById("cancel-checkout-btn").addEventListener("click", () => this.navigateTo("catalog"));

        // Global Auth state triggers
        window.addEventListener("authChange", () => this.checkAuthStatus());
        window.addEventListener("toast", (e) => this.showToast(e.detail.message, e.detail.type));

        // Product Catalog Filter buttons
        document.querySelectorAll(".filter-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                this.state.selectedCategory = btn.getAttribute("data-category");
                this.loadProducts();
            });
        });

        // Catalog Search Input
        const searchInput = document.getElementById("search-input");
        let searchTimeout;
        searchInput.addEventListener("input", () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.state.searchQuery = searchInput.value;
                this.loadProducts();
            }, 400); // Debounce
        });

        // Click handler for Catalog product cards (Delegated listener)
        document.getElementById("products-container").addEventListener("click", (e) => {
            const card = e.target.closest(".product-card");
            const btn = e.target.closest(".add-to-cart-btn");
            
            if (btn) {
                // Clicked Add to Cart inside card
                e.stopPropagation();
                const id = parseInt(btn.getAttribute("data-id"));
                this.addToCart(id);
            } else if (card) {
                // Clicked card itself -> open details
                const id = parseInt(card.getAttribute("data-id"));
                this.openProductDetailsModal(id);
            }
        });

        // Modal close
        document.getElementById("modal-close").addEventListener("click", () => {
            document.getElementById("product-modal").classList.remove("active");
        });
        document.getElementById("product-modal").addEventListener("click", (e) => {
            if (e.target.id === "product-modal") {
                document.getElementById("product-modal").classList.remove("active");
            }
        });

        // Cart Drawer visibility toggle
        const cartDrawer = document.getElementById("cart-drawer");
        const cartOverlay = document.getElementById("cart-drawer-overlay");
        
        document.getElementById("cart-btn").addEventListener("click", () => {
            cartDrawer.classList.add("open");
            cartOverlay.classList.add("active");
        });

        document.getElementById("cart-close").addEventListener("click", () => {
            cartDrawer.classList.remove("open");
            cartOverlay.classList.remove("active");
        });

        cartOverlay.addEventListener("click", () => {
            cartDrawer.classList.remove("open");
            cartOverlay.classList.remove("active");
        });

        // Cart Empty state Browse button
        document.getElementById("cart-empty-browse-btn").addEventListener("click", () => {
            cartDrawer.classList.remove("open");
            cartOverlay.classList.remove("active");
            this.navigateTo("catalog");
        });

        // Cart Drawer quantity buttons (Delegated listener)
        document.getElementById("cart-items-container").addEventListener("click", (e) => {
            const btnMinus = e.target.closest(".qty-minus");
            const btnPlus = e.target.closest(".qty-plus");
            const btnDelete = e.target.closest(".cart-item-delete");

            if (btnMinus) {
                const id = parseInt(btnMinus.getAttribute("data-id"));
                this.changeQuantity(id, -1);
            } else if (btnPlus) {
                const id = parseInt(btnPlus.getAttribute("data-id"));
                this.changeQuantity(id, 1);
            } else if (btnDelete) {
                const id = parseInt(btnDelete.getAttribute("data-id"));
                this.removeFromCart(id);
            }
        });

        // Cart Proceed to Checkout button
        document.getElementById("checkout-btn").addEventListener("click", () => {
            cartDrawer.classList.remove("open");
            cartOverlay.classList.remove("active");
            this.navigateTo("checkout");
        });

        // Admin panel Tabs switching
        document.querySelectorAll(".admin-tab-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".admin-tab-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                this.state.activeAdminTab = btn.getAttribute("data-admin-tab");
                this.loadAdminPanel();
            });
        });

        // Admin: Add new product click
        document.getElementById("add-product-btn").addEventListener("click", () => {
            this.openProductFormModal();
        });

        // Admin: Close product Form modal
        document.getElementById("product-form-close").addEventListener("click", () => {
            this.closeProductFormModal();
        });

        // Admin: Submit Product form (CRUD create/update)
        document.getElementById("product-crud-form").addEventListener("submit", (e) => this.handleProductFormSubmit(e));
    }
}

// Instantiate App on load
document.addEventListener("DOMContentLoaded", () => {
    window.app = new ChronosApp();
});
