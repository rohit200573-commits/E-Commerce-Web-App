/* ==========================================================================
   AUTHENTICATION FORMS CONTROL MODULE
   ========================================================================== */

const Auth = {
    init() {
        this.setupTabs();
        this.setupFormSubmissions();
        
        // Expose to window
        window.Auth = this;
    },

    // Switch tabs: Sign In vs Register
    setupTabs() {
        const tabLogin = document.getElementById('tab-login');
        const tabRegister = document.getElementById('tab-register');
        const formLogin = document.getElementById('login-form');
        const formRegister = document.getElementById('register-form');

        if (tabLogin && tabRegister && formLogin && formRegister) {
            tabLogin.addEventListener('click', () => {
                tabLogin.classList.add('active');
                tabRegister.classList.remove('active');
                formLogin.classList.add('active');
                formRegister.classList.remove('active');
            });

            tabRegister.addEventListener('click', () => {
                tabRegister.classList.add('active');
                tabLogin.classList.remove('active');
                formRegister.classList.add('active');
                formLogin.classList.remove('active');
            });
        }
    },

    // Handle submissions
    setupFormSubmissions() {
        const formLogin = document.getElementById('login-form');
        const formRegister = document.getElementById('register-form');

        // Login
        if (formLogin) {
            formLogin.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('login-email').value.trim();
                const password = document.getElementById('login-password').value;

                try {
                    const data = await API.auth.login(email, password);
                    if (data?.user) {
                        showToast(`Signature verified. Welcome back, ${data.user.username}!`, "success");
                        // Clear fields
                        formLogin.reset();
                        // Redirect based on role
                        window.location.hash = data.user.role === 'admin' ? '#/admin' : '#/dashboard';
                    }
                } catch (err) {
                    showToast(err.message || "Authentication credentials failed.", "error");
                }
            });
        }

        // Register
        if (formRegister) {
            formRegister.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = document.getElementById('register-username').value.trim();
                const email = document.getElementById('register-email').value.trim();
                const password = document.getElementById('register-password').value;

                if (password.length < 6) {
                    showToast("Security keys must be at least 6 characters.", "error");
                    return;
                }

                try {
                    const data = await API.auth.register(username, email, password);
                    if (data?.user) {
                        showToast(`New user footprint initialized. Welcome, ${data.user.username}!`, "success");
                        // Clear fields
                        formRegister.reset();
                        // Redirect
                        window.location.hash = '#/dashboard';
                    }
                } catch (err) {
                    showToast(err.message || "Registration failed.", "error");
                }
            });
        }
    }
};

Auth.init();
