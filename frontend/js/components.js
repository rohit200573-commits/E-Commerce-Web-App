/* ==========================================================================
   Chronos Timepieces Premium UI Components
   ========================================================================== */

const components = {
    // 1. Product Grid Card
    ProductCard(product) {
        const isOutOfStock = product.stock <= 0;
        
        return `
            <div class="product-card" data-id="${product.id}">
                <img src="${product.image_url}" alt="${product.name}" class="product-card-image" onerror="this.src='https://placehold.co/400x400/1a1a20/c5a880?text=${encodeURIComponent(product.name)}'">
                <div class="product-card-info">
                    <span class="product-card-category">${product.category}</span>
                    <h3 class="product-card-title serif-title">${product.name}</h3>
                    <p class="product-card-desc">${product.description || 'No description available.'}</p>
                    <div class="product-card-footer">
                        <span class="product-card-price">${product.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                        ${isOutOfStock ? `
                            <span class="out-of-stock-badge">Sold Out</span>
                        ` : `
                            <button class="btn-primary btn-small add-to-cart-btn" data-id="${product.id}">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                                <span>Acquire</span>
                            </button>
                        `}
                    </div>
                </div>
            </div>
        `;
    },

    // 2. Product Details Modal Content
    ProductDetailModal(product) {
        const isOutOfStock = product.stock <= 0;
        
        return `
            <div class="modal-image-panel">
                <img src="${product.image_url}" alt="${product.name}" onerror="this.src='https://placehold.co/600x600/1a1a20/c5a880?text=${encodeURIComponent(product.name)}'">
            </div>
            <div class="modal-info-panel">
                <span class="modal-category">${product.category}</span>
                <h2 class="serif-title modal-title">${product.name}</h2>
                <div class="modal-price">${product.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                <hr class="divider">
                <p class="modal-desc">${product.description || 'No description available.'}</p>
                
                <div class="modal-meta">
                    <div class="meta-item">
                        <span class="meta-label">Movement</span>
                        <span class="meta-val">${product.category === 'Automatic' || product.category === 'Astronomical' ? 'Automatic Caliber' : 'Quartz / Electronic'}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Availability</span>
                        <span class="meta-val" style="color: ${isOutOfStock ? '#ef4444' : '#10b981'}">
                            ${isOutOfStock ? 'Sold Out' : `${product.stock} pieces in stock`}
                        </span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">Shipping</span>
                        <span class="meta-val" style="color: #10b981">Complimentary</span>
                    </div>
                </div>
                
                <div class="modal-actions">
                    ${isOutOfStock ? `
                        <button class="btn-accent btn-block" disabled>Out of Stock</button>
                    ` : `
                        <button class="btn-accent btn-block modal-add-to-cart-btn" data-id="${product.id}">Add to Collection</button>
                    `}
                </div>
            </div>
        `;
    },

    // 3. Cart Drawer Item
    CartItem(item) {
        return `
            <div class="cart-item" data-id="${item.id}">
                <img src="${item.image_url}" alt="${item.name}" class="cart-item-image" onerror="this.src='https://placehold.co/100x100/1a1a20/c5a880?text=Watch'">
                <div class="cart-item-details">
                    <h4 class="cart-item-title">${item.name}</h4>
                    <div class="cart-item-price">$${item.price.toLocaleString()}</div>
                </div>
                <div class="cart-item-actions">
                    <button class="qty-btn qty-minus" data-id="${item.id}">-</button>
                    <span class="qty-val">${item.quantity}</span>
                    <button class="qty-btn qty-plus" data-id="${item.id}">+</button>
                    <button class="cart-item-delete" data-id="${item.id}" aria-label="Delete item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>
            </div>
        `;
    },

    // 4. Order Card with Live Progress Tracking Timeline
    OrderCard(order) {
        // Parse date
        const date = new Date(order.created_at).toLocaleDateString(undefined, {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        
        // Status classes setup
        const statuses = ["Pending", "Processing", "Shipped", "Delivered"];
        const currentIndex = statuses.indexOf(order.status);
        
        let timelineStepsHtml = '';
        statuses.forEach((status, idx) => {
            let stepClass = '';
            if (idx < currentIndex) {
                stepClass = 'completed';
            } else if (idx === currentIndex) {
                stepClass = 'active';
            }
            
            timelineStepsHtml += `
                <div class="timeline-step ${stepClass}">
                    <div class="step-node">${idx < currentIndex ? '✓' : idx + 1}</div>
                    <span class="step-label">${status}</span>
                </div>
            `;
        });
        
        // Compute line progress width
        const progressPercentage = (currentIndex / (statuses.length - 1)) * 100;
        
        // Items list html
        let itemsHtml = '';
        order.items.forEach(item => {
            itemsHtml += `
                <div class="order-history-item">
                    <span class="order-item-qty-name">
                        <span class="order-item-qty">${item.quantity}x</span> 
                        ${item.product ? item.product.name : 'Unknown Product'}
                    </span>
                    <span class="order-item-price-val">$${(item.price * item.quantity).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
            `;
        });

        const statusClass = `status-${order.status.toLowerCase()}`;

        return `
            <div class="order-history-card">
                <div class="order-card-header">
                    <div>
                        <span class="order-id">Order #${order.id}</span>
                        <div class="order-date">${date}</div>
                    </div>
                    <span class="order-status-badge ${statusClass}">${order.status}</span>
                </div>
                <div class="order-card-items">
                    ${itemsHtml}
                </div>
                <hr class="divider">
                <div class="totals-row total-grand" style="margin-bottom: 1.5rem;">
                    <span>Grand Total</span>
                    <span style="color: var(--accent-gold); font-family: 'Playfair Display', serif;">$${order.total_price.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
                <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1.5rem;">
                    <strong>Shipping Address:</strong> ${order.shipping_address}
                </div>
                
                <!-- Live Timeline -->
                <div class="order-tracking-timeline">
                    <div class="timeline-progress-bar" style="width: calc(${progressPercentage}% - 1rem + (${currentIndex === 3 ? '2rem' : '0rem'}) )"></div>
                    ${timelineStepsHtml}
                </div>
            </div>
        `;
    },

    // 5. Admin Dashboard Inventory Row
    AdminProductRow(product) {
        return `
            <tr data-id="${product.id}">
                <td>
                    <div class="table-prod-info">
                        <img src="${product.image_url}" alt="${product.name}" class="table-prod-img" onerror="this.src='https://placehold.co/80x80/1a1a20/c5a880?text=Watch'">
                        <div>
                            <div class="table-prod-name">${product.name}</div>
                            <div class="text-muted" style="font-size: 0.75rem;">ID: ${product.id}</div>
                        </div>
                    </div>
                </td>
                <td><span style="font-size: 0.85rem; color: var(--accent-gold); font-weight: 500;">${product.category}</span></td>
                <td><span class="table-price-val">$${product.price.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></td>
                <td>
                    <span style="color: ${product.stock <= 2 ? '#ef4444' : 'var(--text-primary)'}; font-weight: 600;">
                        ${product.stock}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-primary btn-small admin-edit-prod-btn" data-id="${product.id}">
                            Edit
                        </button>
                        <button class="btn-danger btn-small admin-delete-prod-btn" data-id="${product.id}">
                            Delete
                        </button>
                    </div>
                </td>
            </tr>
        `;
    },

    // 6. Admin Dashboard Customer Order Row
    AdminOrderRow(order) {
        const date = new Date(order.created_at).toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        
        let itemsSummary = order.items.map(item => `${item.quantity}x ${item.product ? item.product.name : 'Product'}`).join("<br>");
        
        const statuses = ["Pending", "Processing", "Shipped", "Delivered"];
        let selectOptions = '';
        statuses.forEach(status => {
            selectOptions += `<option value="${status}" ${order.status === status ? 'selected' : ''}>${status}</option>`;
        });

        return `
            <tr data-id="${order.id}">
                <td><strong>#${order.id}</strong></td>
                <td><span style="font-size: 0.8rem; color: var(--text-secondary);">${date}</span></td>
                <td>
                    <div style="font-weight: 500;">User #${order.user_id}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${order.shipping_address}">
                        ${order.shipping_address}
                    </div>
                </td>
                <td><div style="font-size: 0.8rem; line-height: 1.3;">${itemsSummary}</div></td>
                <td><span style="font-family: 'Playfair Display', serif; font-weight: 600; color: var(--accent-gold);">$${order.total_price.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></td>
                <td>
                    <select class="admin-status-select" data-id="${order.id}">
                        ${selectOptions}
                    </select>
                </td>
                <td>
                    <button class="btn-primary btn-small admin-update-status-btn" data-id="${order.id}">Update</button>
                </td>
            </tr>
        `;
    },

    // 7. Admin Dashboard Sales Analytics Charts
    AnalyticsDashboard(orders) {
        if (!orders || orders.length === 0) {
            return `
                <div class="no-analytics-message">
                    No orders have been recorded yet. Launch promotions to start collecting analytics!
                </div>
            `;
        }

        // Calculate metrics
        let totalRevenue = 0;
        let totalItemsSold = 0;
        let categorySales = {
            "Automatic": 0,
            "Sport": 0,
            "Astronomical": 0,
            "Accessories": 0
        };

        orders.forEach(order => {
            if (order.status !== "Cancelled") {
                totalRevenue += order.total_price;
                order.items.forEach(item => {
                    totalItemsSold += item.quantity;
                    const cat = (item.product && item.product.category) ? item.product.category : "Automatic";
                    if (categorySales[cat] !== undefined) {
                        categorySales[cat] += item.price * item.quantity;
                    } else {
                        categorySales[cat] = item.price * item.quantity;
                    }
                });
            }
        });

        // Set metrics values in dashboard
        document.getElementById("stat-revenue").innerText = `$${totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.getElementById("stat-orders").innerText = orders.length;
        document.getElementById("stat-items").innerText = totalItemsSold;

        // Render visual chart bars
        let maxCategoryValue = Math.max(...Object.values(categorySales), 1); // Avoid division by zero
        let chartHtml = '';
        
        for (const [category, val] of Object.entries(categorySales)) {
            const barWidth = (val / maxCategoryValue) * 100;
            chartHtml += `
                <div class="chart-row">
                    <div class="chart-row-label">${category}</div>
                    <div class="chart-bar-outer">
                        <div class="chart-bar-inner" style="width: ${barWidth}%"></div>
                    </div>
                    <div class="chart-row-val">$${val.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
                </div>
            `;
        }

        return chartHtml;
    }
};

window.UIComponents = components;
