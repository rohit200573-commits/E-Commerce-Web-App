/* ==========================================================================
   USER AND ADMIN DASHBOARD CONTROLLERS
   ========================================================================== */

const Dashboard = {
    init() {
        this.setupAdminTabs();
        this.setupProductCRUDModal();
        
        // Expose to window
        window.Dashboard = this;
    },

    // ==========================================================================
    // USER DASHBOARD MODULE
    // ==========================================================================
    
    async loadUserDashboard() {
        const user = JSON.parse(localStorage.getItem('senpai_user') || 'null');
        if (!user) return;

        // Set User credentials
        const usernameText = document.getElementById('dashboard-username');
        const nameText = document.getElementById('user-profile-name');
        const emailText = document.getElementById('user-profile-email');

        if (usernameText) usernameText.textContent = user.username;
        if (nameText) nameText.textContent = user.username;
        if (emailText) emailText.textContent = user.email;

        // Fetch User orders
        const list = document.getElementById('user-orders-list');
        if (!list) return;

        list.innerHTML = '<div class="text-center py-5"><i class="fas fa-spinner fa-spin text-neon fa-2x"></i><p class="mt-2 text-muted">Retrieving order footprint...</p></div>';

        try {
            const data = await API.orders.list();
            const orders = data.orders || [];

            if (orders.length === 0) {
                list.innerHTML = `
                    <div class="empty-dashboard-message">
                        <i class="fas fa-satellite text-muted fa-3x mb-3"></i>
                        <p>No orders registered. Enter shop and secure cargo!</p>
                        <a href="#/shop" class="btn btn-neon btn-sm mt-3">Browse Shop</a>
                    </div>
                `;
                return;
            }

            list.innerHTML = orders.map(order => this.buildUserOrderCard(order)).join('');
        } catch (e) {
            list.innerHTML = '<p class="text-center text-muted">Failed to download orders data logs.</p>';
        }
    },

    // Render User order item details with a visual shipping timeline
    buildUserOrderCard(order) {
        const status = order.status;
        
        // Tracking states mapping:
        // Pending: node 1 done, line 16.6%
        // Shipped: node 1, 2 done, line 50%
        // Delivered: node 1, 2, 3 done, line 100%
        let trackWidth = '16.6%';
        let node1 = 'completed';
        let node2 = '';
        let node3 = '';
        
        if (status === 'Shipped') {
            trackWidth = '50%';
            node1 = 'completed';
            node2 = 'completed';
            node3 = 'active-cyan';
        } else if (status === 'Delivered') {
            trackWidth = '100%';
            node1 = 'completed';
            node2 = 'completed';
            node3 = 'completed-cyan';
        } else {
            // Pending
            node2 = 'active';
        }

        const formattedId = String(order.id).padStart(5, '0');
        const totalCost = order.total.toFixed(2);
        
        let itemsHtml = '';
        if (order.items && order.items.length > 0) {
            itemsHtml = `
                <div class="order-items-summary-list">
                    ${order.items.map(item => `
                        <div class="user-order-item-row">
                            <div class="user-order-item-info">
                                <img src="${item.image_url}" alt="${item.product_name}" class="user-order-item-img" onerror="this.src='/static/images/logo.png'">
                                <div>
                                    <span class="user-order-item-title">${item.product_name}</span>
                                    <span class="user-order-item-qty">x${item.quantity}</span>
                                </div>
                            </div>
                            <span class="user-order-item-price">₹${item.price.toFixed(2)}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        return `
            <div class="user-order-card" id="order-log-${order.id}">
                <div class="user-order-header">
                    <div class="user-order-meta">
                        <span>ORDER LOG: <b class="text-neon-cyan">#${formattedId}</b></span>
                        <span>DATE: ${order.order_date}</span>
                        <span>SHIPPED TO: ${order.shipping_name}</span>
                    </div>
                    <div class="user-order-total">
                        Total Sum: ₹${totalCost}
                    </div>
                </div>

                <!-- Shipping Tracker line -->
                <div class="order-tracking-tracker">
                    <div class="tracking-step-line" style="width: ${trackWidth};"></div>
                    
                    <div class="tracking-node ${node1}">
                        <div class="node-icon-circle"><i class="fas fa-check"></i></div>
                        <span class="node-text-label">Ordered</span>
                    </div>
                    <div class="tracking-node ${node2}">
                        <div class="node-icon-circle"><i class="fas fa-cogs"></i></div>
                        <span class="node-text-label">Processing</span>
                    </div>
                    <div class="tracking-node ${node3}">
                        <div class="node-icon-circle"><i class="fas fa-shipping-fast"></i></div>
                        <span class="node-text-label">Delivered</span>
                    </div>
                </div>

                ${itemsHtml}
            </div>
        `;
    },

    // ==========================================================================
    // ADMIN PORTAL MODULE
    // ==========================================================================
    
    async loadAdminDashboard() {
        await this.loadAdminStats();
        await this.loadAdminProductsList();
        await this.loadAdminOrdersList();
    },

    // Toggle tab divisions
    setupAdminTabs() {
        const tabProds = document.getElementById('tab-manage-products');
        const tabOrders = document.getElementById('tab-manage-orders');
        const contentProds = document.getElementById('content-manage-products');
        const contentOrders = document.getElementById('content-manage-orders');

        if (tabProds && tabOrders && contentProds && contentOrders) {
            const setActiveTab = (tabName) => {
                if (tabName === 'orders') {
                    tabOrders.classList.add('active');
                    tabProds.classList.remove('active');
                    contentOrders.classList.add('active');
                    contentProds.classList.remove('active');
                    sessionStorage.setItem('admin_active_tab', 'orders');
                } else {
                    tabProds.classList.add('active');
                    tabOrders.classList.remove('active');
                    contentProds.classList.add('active');
                    contentOrders.classList.remove('active');
                    sessionStorage.setItem('admin_active_tab', 'products');
                }
            };

            tabProds.addEventListener('click', () => setActiveTab('products'));
            tabOrders.addEventListener('click', () => setActiveTab('orders'));

            // [ISSUE-06] Restore tab state on refresh
            const savedTab = sessionStorage.getItem('admin_active_tab');
            if (savedTab) {
                setActiveTab(savedTab);
            }
        }
    },

    // Load revenue metrics, transactions, seed counts and analytics SVG chart
    async loadAdminStats() {
        try {
            const data = await API.admin.getStats();
            const stats = data.stats;

            if (!stats) return;

            // Stats counts
            document.getElementById('admin-stat-sales').textContent = `₹${stats.total_sales.toFixed(2)}`;
            document.getElementById('admin-stat-orders').textContent = stats.total_orders;
            document.getElementById('admin-stat-products').textContent = stats.total_products;
            document.getElementById('admin-stat-users').textContent = stats.total_users;

            // Render Recent Orders table
            const tableBody = document.getElementById('admin-recent-orders-table');
            if (tableBody) {
                if (stats.recent_orders.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No database transactions logs found.</td></tr>';
                } else {
                    tableBody.innerHTML = stats.recent_orders.map(order => {
                        const dateFormatted = order.order_date.split(' ')[0];
                        let statusClass = 'badge-pending';
                        if (order.status === 'Shipped') statusClass = 'badge-shipped';
                        if (order.status === 'Delivered') statusClass = 'badge-delivered';
                        
                        return `
                            <tr>
                                <td><b>#${String(order.id).padStart(4, '0')}</b></td>
                                <td>${order.username}</td>
                                <td>${dateFormatted}</td>
                                <td class="text-neon-cyan">₹${order.total.toFixed(2)}</td>
                                <td><span class="status-badge ${statusClass}">${order.status.toUpperCase()}</span></td>
                            </tr>
                        `;
                    }).join('');
                }
            }

            // Render category chart analytics dynamically inside SVG container
            this.renderCategorySalesChart(stats.category_sales);

        } catch (e) {
            console.error("Failed to load admin metrics", e);
        }
    },

    // Renders interactive horizontal/vertical bars with text inside custom SVG
    renderCategorySalesChart(categorySales) {
        const svg = document.getElementById('svg-bars');
        if (!svg) return;

        svg.innerHTML = '';
        
        // Inject gradient to SVG definitions
        svg.innerHTML = `
            <defs>
                <linearGradient id="pink-cyan-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="var(--neon-pink)" />
                    <stop offset="100%" stop-color="var(--neon-cyan)" />
                </linearGradient>
            </defs>
        `;

        if (categorySales.length === 0) {
            svg.innerHTML += `
                <text x="50%" y="50%" class="svg-chart-text" font-size="12">No category sales records cataloged.</text>
            `;
            return;
        }

        const maxVal = Math.max(...categorySales.map(c => c.revenue), 1);
        const count = categorySales.length;
        
        const svgWidth = svg.clientWidth || 320;
        const colWidth = svgWidth / count;
        const svgHeight = 200;
        
        categorySales.forEach((item, index) => {
            const barHeight = (item.revenue / maxVal) * 110; // Max height 110px
            const x = (index * colWidth) + (colWidth / 2);
            const rectX = x - 20; // Column centering
            const rectY = svgHeight - 40 - barHeight;
            
            // Render shapes
            svg.innerHTML += `
                <rect x="${rectX}" y="${rectY}" width="40" height="${barHeight}" class="svg-chart-bar-rect"></rect>
                <text x="${x}" y="${rectY - 10}" class="svg-chart-value-text">₹${item.revenue.toFixed(0)}</text>
                <text x="${x}" y="${svgHeight - 15}" class="svg-chart-text">${item.category.toUpperCase()}</text>
            `;
        });
    },

    // Load admin products catalog list table rows
    async loadAdminProductsList() {
        const table = document.getElementById('admin-products-table');
        if (!table) return;

        table.innerHTML = '<tr><td colspan="7" class="text-center"><i class="fas fa-spinner fa-spin text-neon fa-lg"></i> Loading catalog...</td></tr>';

        try {
            const data = await API.products.list();
            const products = data.products || [];

            if (products.length === 0) {
                table.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No products created. Click inject button!</td></tr>';
                return;
            }

            table.innerHTML = products.map(p => `
                <tr>
                    <td><b>#${p.id}</b></td>
                    <td><img src="${p.image_url}" alt="" class="product-table-img" onerror="this.src='/static/images/logo.png'"></td>
                    <td class="text-primary font-outfit" style="font-weight: 500;">${p.name}</td>
                    <td>${p.category}</td>
                    <td class="text-neon-cyan">₹${p.price.toFixed(2)}</td>
                    <td>${p.stock} units</td>
                    <td>
                        <div class="admin-actions-cell">
                            <button class="admin-action-btn" onclick="Dashboard.openEditProductModal(${p.id})" title="Edit Details"><i class="fas fa-edit"></i></button>
                            <button class="admin-action-btn btn-delete" onclick="Dashboard.deleteProductAction(${p.id})" title="Delete Product"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `).join('');

        } catch (e) {
            table.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Querying table rows failed.</td></tr>';
        }
    },

    // Load global orders shipments management table rows
    async loadAdminOrdersList() {
        const table = document.getElementById('admin-global-orders-table');
        if (!table) return;

        table.innerHTML = '<tr><td colspan="7" class="text-center"><i class="fas fa-spinner fa-spin text-neon fa-lg"></i> Syncing global shipments logs...</td></tr>';

        try {
            const data = await API.orders.list();
            const orders = data.orders || [];

            if (orders.length === 0) {
                table.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No active shipments logs registered.</td></tr>';
                return;
            }

            table.innerHTML = orders.map(order => {
                const formattedId = String(order.id).padStart(5, '0');
                
                const selectPending = order.status === 'Pending' ? 'selected' : '';
                const selectShipped = order.status === 'Shipped' ? 'selected' : '';
                const selectDelivered = order.status === 'Delivered' ? 'selected' : '';

                let statusBadgeClass = 'badge-pending';
                if (order.status === 'Shipped') statusBadgeClass = 'badge-shipped';
                if (order.status === 'Delivered') statusBadgeClass = 'badge-delivered';

                return `
                    <tr>
                        <td><b>#${formattedId}</b></td>
                        <td>${order.username}</td>
                        <td class="font-outfit">${order.order_date}</td>
                        <td class="text-neon-cyan">₹${order.total.toFixed(2)}</td>
                        <td>${order.payment_method}</td>
                        <td><span class="status-badge ${statusBadgeClass}">${order.status.toUpperCase()}</span></td>
                        <td>
                            <select class="status-select font-outfit" onchange="Dashboard.changeOrderStatus(${order.id}, this.value)">
                                <option value="Pending" ${selectPending}>Pending (Process)</option>
                                <option value="Shipped" ${selectShipped}>Shipped (Transport)</option>
                                <option value="Delivered" ${selectDelivered}>Delivered (Arrived)</option>
                            </select>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (e) {
            table.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Querying shipments list failed.</td></tr>';
        }
    },

    // Global order status changer select dropdown trigger
    async changeOrderStatus(orderId, newStatus) {
        try {
            const data = await API.request(`/api/orders/${orderId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus })
            });
            showToast(data.message || `Order status updated to ${newStatus}`, "success");
            
            // Reload admin data metrics
            await this.loadAdminStats();
            await this.loadAdminOrdersList();
        } catch (e) {
            showToast("Failed to process status changes.", "error");
        }
    },

    // ==========================================================================
    // PRODUCT CRUD MODAL LOGICS
    // ==========================================================================
    
    setupProductCRUDModal() {
        const btnCreate = document.getElementById('btn-create-product-modal');
        const btnClose = document.getElementById('close-product-modal');
        const backdrop = document.getElementById('product-modal-backdrop');
        const modal = document.getElementById('product-modal');
        const form = document.getElementById('product-crud-form');

        const openModal = () => {
            backdrop.classList.add('active');
            modal.classList.add('active');
        };

        const closeModal = () => {
            backdrop.classList.remove('active');
            modal.classList.remove('active');
        };

        if (btnCreate) {
            btnCreate.addEventListener('click', () => {
                // Configure Form to default Create mode
                form.reset();
                document.getElementById('crud-product-id').value = '';
                document.getElementById('product-modal-title').textContent = 'INJECT NEW PRODUCT';
                document.getElementById('crud-submit-btn').textContent = 'INJECT PRODUCT';
                openModal();
            });
        }

        if (btnClose) btnClose.addEventListener('click', closeModal);
        if (backdrop) backdrop.addEventListener('click', closeModal);

        // Submit Form Handler
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                const id = document.getElementById('crud-product-id').value;
                const name = document.getElementById('crud-name').value.trim();
                const description = document.getElementById('crud-description').value.trim();
                const price = parseFloat(document.getElementById('crud-price').value);
                const stock = parseInt(document.getElementById('crud-stock').value);
                const category = document.getElementById('crud-category').value;
                const imageUrl = document.getElementById('crud-image-url').value;

                const productData = { name, description, price, stock, category, image_url: imageUrl };

                try {
                    if (id) {
                        // Edit/Update mode
                        const data = await API.products.update(id, productData);
                        showToast(data.message || "Product updated successfully.", "success");
                    } else {
                        // Create mode
                        const data = await API.products.create(productData);
                        showToast(data.message || "Product created successfully.", "success");
                    }
                    closeModal();
                    await this.loadAdminDashboard();
                } catch (err) {
                    showToast(err.message || "Failed to submit product adjustments.", "error");
                }
            });
        }
    },

    // Edit row action click loader
    async openEditProductModal(productId) {
        const backdrop = document.getElementById('product-modal-backdrop');
        const modal = document.getElementById('product-modal');
        const form = document.getElementById('product-crud-form');

        try {
            const data = await API.products.get(productId);
            const p = data.product;

            if (p) {
                // Populate forms
                document.getElementById('crud-product-id').value = p.id;
                document.getElementById('crud-name').value = p.name;
                document.getElementById('crud-description').value = p.description;
                document.getElementById('crud-price').value = p.price;
                document.getElementById('crud-stock').value = p.stock;
                document.getElementById('crud-category').value = p.category;
                document.getElementById('crud-image-url').value = p.image_url;

                document.getElementById('product-modal-title').textContent = 'UPDATE PRODUCT DETAILS';
                document.getElementById('crud-submit-btn').textContent = 'EXECUTE CHANGES';

                backdrop.classList.add('active');
                modal.classList.add('active');
            }
        } catch (e) {
            showToast("Failed to fetch target product.", "error");
        }
    },

    // Delete row action click action
    async deleteProductAction(productId) {
        if (confirm("Are you sure you want to delete this product from the database catalog?")) {
            try {
                const data = await API.products.delete(productId);
                showToast(data.message || "Product deleted successfully.", "success");
                await this.loadAdminDashboard();
            } catch (e) {
                showToast("Failed to execute product delete action.", "error");
            }
        }
    }
};

Dashboard.init();
