/* ==========================================================================
   SHOP CATALOG AND CART CONTROLLER MODULE
   ========================================================================== */

const Shop = {
    cart: [],

    // Initialize Cart and event handlers
    init() {
        this.loadCart();
        this.setupCartUI();
        
        // Listen for auth changes to sync cart
        window.addEventListener('auth-status-changed', async () => {
            const user = localStorage.getItem('senpai_user');
            if (user) {
                const localCart = localStorage.getItem('senpai_cart');
                if (localCart) {
                    try {
                        const items = JSON.parse(localCart);
                        if (items.length > 0) {
                            await API.cart.sync(items);
                        }
                    } catch(e) {}
                    localStorage.removeItem('senpai_cart');
                }
            } else {
                this.cart = []; // clear cart on logout
            }
            await this.loadCart();
        });

        // Expose to global scope for onClick bindings
        window.Shop = this;
    },

    isLoggedIn() {
        return !!localStorage.getItem('senpai_user');
    },

    // Retrieve cart items from localStorage or API
    async loadCart() {
        if (this.isLoggedIn()) {
            try {
                const data = await API.cart.get();
                this.cart = data.items || [];
            } catch(e) {
                console.error("Failed to load DB cart", e);
                this.cart = [];
            }
        } else {
            const storedCart = localStorage.getItem('senpai_cart');
            if (storedCart) {
                try {
                    this.cart = JSON.parse(storedCart);
                } catch (e) {
                    this.cart = [];
                }
            } else {
                this.cart = [];
            }
        }
        this.updateCartBadge();
        this.renderCartDrawer();
    },

    // Save cart state
    async saveCart() {
        if (!this.isLoggedIn()) {
            localStorage.setItem('senpai_cart', JSON.stringify(this.cart));
        }
        this.updateCartBadge();
        this.renderCartDrawer();
    },

    // Add item to cart
    async addToCart(product, quantity = 1) {
        if (product.stock <= 0) {
            showToast("This item is currently out of stock.", "error");
            return;
        }

        if (this.isLoggedIn()) {
            try {
                const existingItem = this.cart.find(item => item.product_id === product.id);
                const currentQty = existingItem ? existingItem.quantity : 0;
                if (currentQty + quantity > product.stock) {
                    showToast(`Cannot add more. Limit reached (Only ${product.stock} in stock).`, "error");
                    return;
                }
                // When we add in our DB, we update to absolute quantity, so we need newQty
                await API.cart.update(product.id, currentQty + quantity);
                await this.loadCart();
                this.animateCartBadge();
                showToast(`Added ${product.name} to cart.`, "success");
            } catch (e) {
                showToast("Failed to add to cart.", "error");
            }
        } else {
            const existingItem = this.cart.find(item => item.product_id === product.id);
            
            if (existingItem) {
                const newQty = existingItem.quantity + quantity;
                if (newQty > product.stock) {
                    showToast(`Cannot add more. Limit reached (Only ${product.stock} in stock).`, "error");
                    return;
                }
                existingItem.quantity = newQty;
            } else {
                this.cart.push({
                    product_id: product.id,
                    name: product.name,
                    price: product.price,
                    image_url: product.image_url,
                    category: product.category,
                    quantity: quantity,
                    stock: product.stock
                });
            }

            this.saveCart();
            this.animateCartBadge();
            showToast(`Added ${product.name} to cart.`, "success");
        }
    },

    // Update quantity
    async updateQuantity(productId, newQty) {
        const item = this.cart.find(item => item.product_id === productId);
        if (!item) return;

        if (newQty <= 0) {
            this.removeFromCart(productId);
            return;
        }

        if (newQty > item.stock) {
            showToast(`Only ${item.stock} units available in stock.`, "error");
            return;
        }

        if (this.isLoggedIn()) {
            try {
                await API.cart.update(productId, newQty);
                await this.loadCart();
            } catch (e) {
                showToast("Failed to update cart.", "error");
            }
        } else {
            item.quantity = newQty;
            this.saveCart();
        }
    },

    // Remove item from cart
    async removeFromCart(productId) {
        if (this.isLoggedIn()) {
            try {
                await API.cart.remove(productId);
                await this.loadCart();
                showToast("Item removed from cart.", "success");
            } catch(e) {
                showToast("Failed to remove item.", "error");
            }
        } else {
            const item = this.cart.find(item => item.product_id === productId);
            this.cart = this.cart.filter(item => item.product_id !== productId);
            this.saveCart();
            if (item) {
                showToast(`Removed ${item.name} from cart.`, "success");
            }
        }
    },

    // Empty cart
    clearCart() {
        this.cart = [];
        this.saveCart();
    },

    // Calculate cart sum
    getCartSubtotal() {
        return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    },

    // Update cart counts badge
    updateCartBadge() {
        const badge = document.getElementById('cart-count');
        if (badge) {
            const count = this.cart.reduce((sum, item) => sum + item.quantity, 0);
            badge.textContent = count;
            badge.style.display = count > 0 ? 'flex' : 'none';
        }
    },

    animateCartBadge() {
        const badge = document.getElementById('cart-count');
        if (badge) {
            badge.style.animation = 'none';
            // Trigger reflow to restart animation
            badge.offsetHeight; 
            badge.style.animation = 'bounceBadge 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        }
    },

    // Toggle slide-out Cart Sidebar drawer
    setupCartUI() {
        const cartTrigger = document.getElementById('cart-trigger');
        const closeCart = document.getElementById('close-cart');
        const backdrop = document.getElementById('cart-backdrop');
        const drawer = document.getElementById('cart-drawer');

        const openDrawer = () => {
            drawer.classList.add('active');
            backdrop.classList.add('active');
            this.renderCartDrawer();
        };

        const closeDrawer = () => {
            drawer.classList.remove('active');
            backdrop.classList.remove('active');
        };

        if (cartTrigger) cartTrigger.addEventListener('click', openDrawer);
        if (closeCart) closeCart.addEventListener('click', closeDrawer);
        if (backdrop) backdrop.addEventListener('click', closeDrawer);
    },

    // Render cart items inside side drawer
    renderCartDrawer() {
        const list = document.getElementById('cart-items');
        const subtotalText = document.getElementById('cart-subtotal');
        
        if (!list) return;

        if (this.cart.length === 0) {
            list.innerHTML = `
                <div class="empty-cart-message">
                    <i class="fas fa-shopping-bag text-neon"></i>
                    <p>Your cart is empty. Add anime merch!</p>
                    <a href="#/shop" class="btn btn-neon btn-sm" onclick="document.getElementById('close-cart').click()">Browse Shop</a>
                </div>
            `;
            if (subtotalText) subtotalText.textContent = "₹0.00";
            return;
        }

        let html = '';
        this.cart.forEach(item => {
            html += `
                <div class="cart-item">
                    <img src="${item.image_url}" alt="${item.name}" class="cart-item-img">
                    <div class="cart-item-details">
                        <div>
                            <h4 class="cart-item-title">${item.name}</h4>
                            <span class="cart-item-category">${item.category}</span>
                        </div>
                        <div class="cart-item-price">₹${(item.price * item.quantity).toFixed(2)}</div>
                        <div class="cart-item-qty">
                            <button class="qty-btn" onclick="Shop.updateQuantity(${item.product_id}, ${item.quantity - 1})"><i class="fas fa-minus"></i></button>
                            <span class="qty-num">${item.quantity}</span>
                            <button class="qty-btn" onclick="Shop.updateQuantity(${item.product_id}, ${item.quantity + 1})"><i class="fas fa-plus"></i></button>
                        </div>
                    </div>
                    <button class="cart-item-remove" onclick="Shop.removeFromCart(${item.product_id})" aria-label="Remove Item">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
        });

        list.innerHTML = html;
        if (subtotalText) {
            subtotalText.textContent = `₹${this.getCartSubtotal().toFixed(2)}`;
        }
    },

    // ==========================================================================
    // CATALOG DOM RENDERING FLOWS
    // ==========================================================================

    // Fetch and load featured catalog grid (Home page)
    async loadFeaturedProducts() {
        const grid = document.getElementById('featured-products-grid');
        if (!grid) return;

        grid.innerHTML = '<div class="text-center w-full"><i class="fas fa-spinner fa-spin text-neon"></i> Loading featured items...</div>';

        try {
            const data = await API.products.list();
            const products = data.products || [];
            
            // Slice first 3 items for display
            const featured = products.slice(0, 3);
            
            if (featured.length === 0) {
                grid.innerHTML = '<p class="text-muted">No merchandise cataloged yet.</p>';
                return;
            }

            grid.innerHTML = featured.map(p => this.buildProductCard(p)).join('');
        } catch (e) {
            grid.innerHTML = '<p class="text-muted">Failed to retrieve network products database.</p>';
        }
    },

    // Initialize main Shop Catalog view filters & grid items
    async initShopPage(queryParams = {}) {
        const categoryFilter = queryParams.category || 'all';
        const searchFilter = queryParams.search || '';
        
        // Highlight active sidebar categories
        const filterBtns = document.querySelectorAll('#sidebar-categories .filter-btn');
        filterBtns.forEach(btn => {
            if (btn.getAttribute('data-category') === categoryFilter) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Set search values
        const searchInput = document.getElementById('sidebar-search-input');
        if (searchInput) searchInput.value = searchFilter;

        // Rerender products listing
        await this.loadShopProducts({
            category: categoryFilter,
            search: searchFilter
        });

        // Attach filter category actions
        this.bindShopSidebarEvents();
    },

    // Attach click listeners to sidebar categories
    bindShopSidebarEvents() {
        const categoryContainer = document.getElementById('sidebar-categories');
        if (!categoryContainer) return;
        
        // Unbind and rebind to prevent duplicates
        categoryContainer.replaceWith(categoryContainer.cloneNode(true));
        
        const newCategoryContainer = document.getElementById('sidebar-categories');
        const filterBtns = newCategoryContainer.querySelectorAll('.filter-btn');
        
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const category = btn.getAttribute('data-category');
                
                // Get other search properties
                const search = document.getElementById('sidebar-search-input').value.trim();
                const sort = document.getElementById('sort-select').value;
                
                // Build hash state
                const params = new URLSearchParams();
                if (category && category !== 'all') params.append('category', category);
                if (search) params.append('search', search);
                
                window.location.hash = `#/shop${params.toString() ? '?' + params.toString() : ''}`;
            });
        });

        // Bind Search Click
        const searchBtn = document.getElementById('sidebar-search-btn');
        if (searchBtn) {
            searchBtn.replaceWith(searchBtn.cloneNode(true));
            document.getElementById('sidebar-search-btn').addEventListener('click', () => {
                this.triggerShopSearch();
            });
        }

        // Bind Sort Change
        const sortSelect = document.getElementById('sort-select');
        if (sortSelect) {
            sortSelect.replaceWith(sortSelect.cloneNode(true));
            document.getElementById('sort-select').addEventListener('change', () => {
                this.triggerShopSearch();
            });
        }
    },

    triggerShopSearch() {
        const activeBtn = document.querySelector('#sidebar-categories .filter-btn.active');
        const category = activeBtn ? activeBtn.getAttribute('data-category') : 'all';
        const search = document.getElementById('sidebar-search-input').value.trim();
        
        const params = new URLSearchParams();
        if (category && category !== 'all') params.append('category', category);
        if (search) params.append('search', search);
        
        window.location.hash = `#/shop${params.toString() ? '?' + params.toString() : ''}`;
    },

    // Fetch and load products grid
    async loadShopProducts(filters = {}) {
        const grid = document.getElementById('shop-products-grid');
        const countText = document.getElementById('results-count');
        if (!grid) return;

        grid.innerHTML = '<div class="text-center w-full py-5"><i class="fas fa-spinner fa-spin text-neon fa-2x"></i><p class="mt-3">Retrieving system database...</p></div>';

        try {
            // Get sort selector
            const sortSelect = document.getElementById('sort-select');
            const sortBy = sortSelect ? sortSelect.value : 'newest';
            
            const data = await API.products.list({
                ...filters,
                sort_by: sortBy
            });
            const products = data.products || [];

            if (countText) {
                countText.textContent = `${products.length} Items Found`;
            }

            if (products.length === 0) {
                grid.innerHTML = `
                    <div class="text-center w-full py-5">
                        <i class="fas fa-search-minus text-muted fa-3x"></i>
                        <p class="mt-3 text-muted">No items matched your footprint.</p>
                    </div>
                `;
                return;
            }

            grid.innerHTML = products.map(p => this.buildProductCard(p)).join('');
        } catch (e) {
            grid.innerHTML = '<p class="text-muted">Failed to query catalog network database.</p>';
        }
    },

    // Construct product card HTML template markup
    buildProductCard(product) {
        const isOutOfStock = product.stock <= 0;
        
        let stockBadge = '';
        if (isOutOfStock) {
            stockBadge = `<span class="stock-badge out-of-stock">SOLD OUT</span>`;
        } else if (product.stock <= 5) {
            stockBadge = `<span class="stock-badge">ONLY ${product.stock} LEFT</span>`;
        }

        return `
            <div class="product-card" id="card-item-${product.id}">
                <div class="product-image-wrap">
                    <span class="product-tag">${product.category}</span>
                    ${stockBadge}
                    <img src="${product.image_url}" alt="${product.name}" class="product-card-img" onerror="this.src='/static/images/logo.png'">
                    <div class="product-overlay">
                        <a href="#/product/${product.id}" class="btn btn-glow product-overlay-btn">QUICK VIEW</a>
                    </div>
                </div>
                <div class="product-info">
                    <h3 class="product-title">${product.name}</h3>
                    <p class="product-desc-excerpt">${product.description}</p>
                    <div class="product-card-footer">
                        <span class="product-price">₹${product.price.toFixed(2)}</span>
                        <button class="btn-add-quick" onclick="Shop.quickAddToCart(${product.id})" aria-label="Add to cart" ${isOutOfStock ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : ''}>
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    // Fast quick add button binding action on catalog card list
    async quickAddToCart(productId) {
        try {
            const data = await API.products.get(productId);
            if (data?.product) {
                this.addToCart(data.product, 1);
            }
        } catch (e) {
            showToast("Failed to fetch product data.", "error");
        }
    },

    // ==========================================================================
    // DETAIL PAGE LOADER & RENDERS
    // ==========================================================================

    async loadProductDetails(id) {
        const content = document.getElementById('product-detail-content');
        if (!content) return;

        content.innerHTML = '<div class="text-center w-full py-5"><i class="fas fa-spinner fa-spin text-neon fa-3x"></i><p class="mt-3">Syncing item profile...</p></div>';

        try {
            const data = await API.products.get(id);
            const product = data.product;

            if (!product) {
                content.innerHTML = '<p class="text-center text-muted">Item classification has been deleted or is unavailable.</p>';
                return;
            }

            const isOutOfStock = product.stock <= 0;
            const stockStatusStr = isOutOfStock ? "Out of Stock" : `In Stock (${product.stock} units)`;
            
            // Visual Stars Rating calculation (Simulated)
            const starsRating = 4 + (product.id % 2 === 0 ? 1 : 0); // 4 or 5 stars based on id
            let starHtml = '';
            for(let i=0; i<5; i++) {
                starHtml += `<i class="${i < starsRating ? 'fas' : 'far'} fa-star"></i>`;
            }

            content.innerHTML = `
                <div class="detail-image-panel">
                    <img src="${product.image_url}" alt="${product.name}" class="detail-img" onerror="this.src='/static/images/logo.png'">
                </div>
                <div class="detail-info-panel">
                    <span class="detail-category">${product.category.toUpperCase()} Classification</span>
                    <h2 class="detail-title">${product.name}</h2>
                    <div class="detail-rating">
                        ${starHtml}
                        <span>(${12 + (product.id * 7)} Verified Logs)</span>
                    </div>
                    <div class="detail-price-box">
                        <span class="detail-price">₹${product.price.toFixed(2)}</span>
                    </div>
                    <p class="detail-description">${product.description}</p>
                    
                    <div class="detail-specs">
                        <div class="spec-item">
                            <span class="spec-label">SYSTEM AVAILABILITY</span>
                            <span class="spec-val ${isOutOfStock ? 'text-neon' : ''}" style="${isOutOfStock ? '' : 'color:var(--neon-green)'}">${stockStatusStr}</span>
                        </div>
                        <div class="spec-item">
                            <span class="spec-label">AUTHENTIC SEED</span>
                            <span class="spec-val">100% Genuine Collectible</span>
                        </div>
                    </div>

                    <div class="detail-actions">
                        <div class="detail-qty-select" style="${isOutOfStock ? 'opacity:0.3; pointer-events:none;' : ''}">
                            <button class="qty-btn" onclick="Shop.decrementDetailQty()"><i class="fas fa-minus"></i></button>
                            <span class="qty-num" id="detail-qty-val">1</span>
                            <button class="qty-btn" onclick="Shop.incrementDetailQty(${product.stock})"><i class="fas fa-plus"></i></button>
                        </div>
                        <button class="btn btn-glow btn-lg" onclick="Shop.addDetailToCart(${product.id})" ${isOutOfStock ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}>
                            <i class="fas fa-shopping-bag"></i> ADD CONTAINMENT SECURE
                        </button>
                    </div>
                </div>
            `;
        } catch (e) {
            content.innerHTML = '<p class="text-center text-muted">Error querying network database details.</p>';
        }
    },

    incrementDetailQty(maxStock) {
        const qtyEl = document.getElementById('detail-qty-val');
        if (qtyEl) {
            let val = parseInt(qtyEl.textContent);
            if (val < maxStock) {
                qtyEl.textContent = val + 1;
            } else {
                showToast("Cannot exceed maximum available inventory stock.", "error");
            }
        }
    },

    decrementDetailQty() {
        const qtyEl = document.getElementById('detail-qty-val');
        if (qtyEl) {
            let val = parseInt(qtyEl.textContent);
            if (val > 1) {
                qtyEl.textContent = val - 1;
            }
        }
    },

    async addDetailToCart(productId) {
        const qtyEl = document.getElementById('detail-qty-val');
        const qty = qtyEl ? parseInt(qtyEl.textContent) : 1;
        
        try {
            const data = await API.products.get(productId);
            if (data?.product) {
                this.addToCart(data.product, qty);
            }
        } catch (e) {
            showToast("Failed to fetch product data.", "error");
        }
    }
};

// Start shop on window load
Shop.init();
