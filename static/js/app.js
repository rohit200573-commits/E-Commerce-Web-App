/* ==========================================================================
   MAIN ROUTER AND APPLICATION CONTROLLER
   ========================================================================== */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initial State Check (Authed check)
    await initAuthStatus();

    // 2. Setup Router navigation listeners
    window.addEventListener('hashchange', handleRoute);
    
    // Trigger initial route
    handleRoute();

    // 3. Setup General DOM listeners (Header elements, modals, dropdowns)
    setupUIEventHandlers();

    // 4. Hide boot preloader with fade out
    const preloader = document.getElementById('preloader');
    if (preloader) {
        setTimeout(() => {
            preloader.style.opacity = '0';
            preloader.style.visibility = 'hidden';
        }, 800);
    }
});

// Navigation Route Router
async function handleRoute() {
    const hash = window.location.hash || '#/';
    
    // Hide all views
    const views = document.querySelectorAll('.view-section');
    views.forEach(view => view.classList.remove('active'));
    
    // Update navigation item highlights
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));

    // Route Parsing logic
    let route = hash;
    let queryParams = {};

    if (hash.includes('?')) {
        const parts = hash.split('?');
        route = parts[0];
        const searchParams = new URLSearchParams(parts[1]);
        for (const [key, value] of searchParams.entries()) {
            queryParams[key] = value;
        }
    }

    // Scroll back to top smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Load active profile data
    const user = JSON.parse(localStorage.getItem('senpai_user') || 'null');

    // Route Switchboard
    if (route === '#/' || route === '#') {
        const view = document.getElementById('home-view');
        if (view) view.classList.add('active');
        const nav = document.getElementById('nav-home');
        if (nav) nav.classList.add('active');
        
        // Load featured items
        if (window.Shop) window.Shop.loadFeaturedProducts();

    } else if (route === '#/shop') {
        const view = document.getElementById('shop-view');
        if (view) view.classList.add('active');
        const nav = document.getElementById('nav-shop');
        if (nav) nav.classList.add('active');
        
        // Initialize Shop Catalog filters or sorting
        if (window.Shop) window.Shop.initShopPage(queryParams);

    } else if (route.startsWith('#/product/')) {
        // e.g. #/product/12
        const view = document.getElementById('product-detail-view');
        if (view) view.classList.add('active');
        
        const productId = route.split('/').pop();
        if (window.Shop) window.Shop.loadProductDetails(productId);

    } else if (route === '#/auth') {
        // Redirect if already logged in
        if (user) {
            window.location.hash = user.role === 'admin' ? '#/admin' : '#/dashboard';
            return;
        }
        const view = document.getElementById('auth-view');
        if (view) view.classList.add('active');

    } else if (route === '#/checkout') {
        // Must be logged in to checkout
        if (!user) {
            showToast("Please log in to proceed with checkout.", "error");
            window.location.hash = '#/auth';
            return;
        }
        const view = document.getElementById('checkout-view');
        if (view) view.classList.add('active');
        
        // Initialize Checkout fields and summary
        if (window.Checkout) window.Checkout.initCheckoutPage();

    } else if (route === '#/dashboard') {
        // User dashboard
        if (!user) {
            window.location.hash = '#/auth';
            return;
        }
        const view = document.getElementById('user-dashboard-view');
        if (view) view.classList.add('active');
        
        const nav = document.getElementById('nav-dashboard');
        if (nav) nav.classList.add('active');

        // Load dashboard order values
        if (window.Dashboard) window.Dashboard.loadUserDashboard();

    } else if (route === '#/admin') {
        // Admin portal
        if (!user || user.role !== 'admin') {
            showToast("Unauthorized root access denied.", "error");
            window.location.hash = '#/';
            return;
        }
        const view = document.getElementById('admin-dashboard-view');
        if (view) view.classList.add('active');
        
        const nav = document.getElementById('nav-admin');
        if (nav) nav.classList.add('active');

        // Load admin management catalog and logs
        if (window.Dashboard) window.Dashboard.loadAdminDashboard();

    } else {
        // 404 fallback: Home page
        console.warn(`Route ${route} not found. Fallback to Home.`);
        window.location.hash = '#/';
    }
}

// Check and verify initial auth tokens
async function initAuthStatus() {
    const user = await API.auth.me();
    updateUIForAuth(user);

    // Watch for login changes dispatched globally
    window.addEventListener('auth-status-changed', () => {
        const updatedUser = JSON.parse(localStorage.getItem('senpai_user') || 'null');
        updateUIForAuth(updatedUser);
    });
}

// Change header links based on user role authorization
function updateUIForAuth(user) {
    const dot = document.getElementById('user-status-dot');
    const greeting = document.querySelector('.user-greeting');
    const subtitle = document.querySelector('.user-subtext');
    const authLinks = document.getElementById('dropdown-auth-links');
    const userLinks = document.getElementById('dropdown-user-links');
    
    const adminItems = document.querySelectorAll('.admin-only');
    const userItems = document.querySelectorAll('.user-only');

    if (user) {
        // Logged in
        dot.className = "status-dot online";
        greeting.textContent = `Welcome, ${user.username}`;
        subtitle.textContent = user.role === 'admin' ? "ROOT CONTROLLER" : "CUSTOMER ACCOUNT";
        
        authLinks.style.display = 'none';
        userLinks.style.display = 'block';

        if (user.role === 'admin') {
            adminItems.forEach(el => el.style.display = 'inline-block');
            userItems.forEach(el => el.style.display = 'none');
        } else {
            adminItems.forEach(el => el.style.display = 'none');
            userItems.forEach(el => el.style.display = 'inline-block');
        }
    } else {
        // Logged out
        dot.className = "status-dot";
        greeting.textContent = "Welcome, Guest";
        subtitle.textContent = "Access your dashboard";
        
        authLinks.style.display = 'block';
        userLinks.style.display = 'none';
        
        adminItems.forEach(el => el.style.display = 'none');
        userItems.forEach(el => el.style.display = 'none');
    }
}

// UI Dropdowns & Search triggers
function setupUIEventHandlers() {
    // 1. Account Dropdown trigger
    const profileTrigger = document.getElementById('profile-trigger');
    const dropdown = document.getElementById('profile-dropdown');
    
    if (profileTrigger && dropdown) {
        profileTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('active');
        });

        document.addEventListener('click', () => {
            dropdown.classList.remove('active');
        });
    }

    // 2. Global search bar form
    const searchForm = document.getElementById('search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const query = document.getElementById('search-input').value.trim();
            if (query) {
                window.location.hash = `#/shop?search=${encodeURIComponent(query)}`;
                document.getElementById('search-input').value = '';
            }
        });
    }

    // 3. Logout action click
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            API.auth.logout();
        });
    }
}

window.handleRoute = handleRoute;
