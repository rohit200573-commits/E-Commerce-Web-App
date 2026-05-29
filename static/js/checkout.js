/* ==========================================================================
   CHECKOUT OPERATIONS & 3D PAYMENT CARD CONTROLLER
   ========================================================================== */

const Checkout = {
    init() {
        this.setupCardFlipping();
        this.setupFormSubmissions();
        
        // Expose to window
        window.Checkout = this;
    },

    // Initialize checkout page summary and check cart contents
    initCheckoutPage() {
        const cartItems = Shop.cart;
        
        if (cartItems.length === 0) {
            showToast("Your cart is empty. Please add items before checking out.", "error");
            window.location.hash = '#/shop';
            return;
        }

        this.renderOrderSummary();
    },

    // Render summary list and calculate checkout totals
    renderOrderSummary() {
        const container = document.getElementById('checkout-summary-items');
        const subtotalText = document.getElementById('checkout-subtotal');
        const totalText = document.getElementById('checkout-total');
        
        if (!container) return;

        let html = '';
        Shop.cart.forEach(item => {
            html += `
                <div class="checkout-summary-item">
                    <div class="checkout-item-meta">
                        <span class="checkout-item-title">${item.name}</span>
                        <span class="checkout-item-qty">x${item.quantity}</span>
                    </div>
                    <span class="checkout-item-price">₹${(item.price * item.quantity).toFixed(2)}</span>
                </div>
            `;
        });

        container.innerHTML = html;
        
        const subtotal = Shop.getCartSubtotal();
        if (subtotalText) subtotalText.textContent = `₹${subtotal.toFixed(2)}`;
        if (totalText) totalText.textContent = `₹${subtotal.toFixed(2)}`;
    },

    // ==========================================================================
    // 3D CARD MOCKUP CONTROLLER
    // ==========================================================================
    
    setupCardFlipping() {
        const cardMockup = document.getElementById('payment-card-mockup');
        
        const nameInput = document.getElementById('card-holder-input');
        const numberInput = document.getElementById('card-number-input');
        const expiryInput = document.getElementById('card-expiry-input');
        const cvvInput = document.getElementById('card-cvv-input');

        const mockName = document.getElementById('mock-card-name');
        const mockNumber = document.getElementById('mock-card-number');
        const mockExpiry = document.getElementById('mock-card-expiry');
        const mockCvv = document.getElementById('mock-card-cvv');

        if (!cardMockup) return;

        // Click to manually flip
        cardMockup.addEventListener('click', () => {
            cardMockup.classList.toggle('flipped');
        });

        // Focus CVV flips to back
        if (cvvInput) {
            cvvInput.addEventListener('focus', () => {
                cardMockup.classList.add('flipped');
            });
            cvvInput.addEventListener('blur', () => {
                cardMockup.classList.remove('flipped');
            });
        }

        // Live input listeners for front of card
        if (nameInput && mockName) {
            nameInput.addEventListener('input', () => {
                mockName.textContent = nameInput.value.trim().toUpperCase() || "CHOSEN ONE";
            });
        }

        if (numberInput && mockNumber) {
            numberInput.addEventListener('input', (e) => {
                let val = numberInput.value.replace(/\D/g, '');
                
                // Format card spacing (e.g. 0000 0000 0000 0000)
                let formatted = '';
                for (let i = 0; i < val.length; i++) {
                    if (i > 0 && i % 4 === 0) {
                        formatted += ' ';
                    }
                    formatted += val[i];
                }
                
                numberInput.value = formatted;
                mockNumber.textContent = formatted || "•••• •••• •••• ••••";
            });
        }

        if (expiryInput && mockExpiry) {
            expiryInput.addEventListener('input', () => {
                let val = expiryInput.value.replace(/\D/g, '');
                
                // Auto insert forward slash (MM/YY)
                if (val.length >= 2) {
                    expiryInput.value = val.slice(0, 2) + '/' + val.slice(2, 4);
                } else {
                    expiryInput.value = val;
                }
                
                mockExpiry.textContent = expiryInput.value || "MM/YY";
            });
        }

        if (cvvInput && mockCvv) {
            cvvInput.addEventListener('input', () => {
                let val = cvvInput.value.replace(/\D/g, '');
                cvvInput.value = val;
                mockCvv.textContent = val || "•••";
            });
        }

        // Setup payment method selection buttons toggles
        const paymentOptions = document.querySelectorAll('.payment-option-btn');
        paymentOptions.forEach(opt => {
            opt.addEventListener('click', () => {
                paymentOptions.forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                
                const radio = opt.querySelector('input[type="radio"]');
                if (radio) radio.checked = true;
                
                // Disable card input fields if Cyber-Wallet/Cash is chosen
                const cardFields = [nameInput, numberInput, expiryInput, cvvInput];
                if (radio.value === 'Cyber-Wallet') {
                    cardFields.forEach(f => {
                        f.disabled = true;
                        f.required = false;
                        f.style.opacity = '0.4';
                    });
                    if (cardMockup) cardMockup.style.opacity = '0.35';
                } else {
                    cardFields.forEach(f => {
                        f.disabled = false;
                        f.required = true;
                        f.style.opacity = '1';
                    });
                    if (cardMockup) cardMockup.style.opacity = '1';
                }
            });
        });
    },

    // ==========================================================================
    // ORDER SUBMISSION HANDLER
    // ==========================================================================
    
    setupFormSubmissions() {
        const checkoutForm = document.getElementById('checkout-form');
        
        if (checkoutForm) {
            checkoutForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const shippingName = document.getElementById('shipping-name').value.trim();
                const shippingAddress = document.getElementById('shipping-address').value.trim();
                const shippingCity = document.getElementById('shipping-city').value.trim();
                const shippingZip = document.getElementById('shipping-zip').value.trim();
                
                const paymentMethod = document.querySelector('input[name="payment_method"]:checked').value;
                
                // [ISSUE-07] Client-side Credit Card Validation (Luhn algorithm & formats)
                if (paymentMethod === 'Credit Card') {
                    const name = document.getElementById('card-holder-input').value.trim();
                    const cardNumber = document.getElementById('card-number-input').value.replace(/\s/g, '');
                    const expiry = document.getElementById('card-expiry-input').value.trim();
                    const cvv = document.getElementById('card-cvv-input').value.trim();

                    if (!name) {
                        showToast("Please enter the cardholder name.", "error");
                        return;
                    }

                    if (cardNumber.length < 13 || cardNumber.length > 19 || !/^\d+$/.test(cardNumber)) {
                        showToast("Please enter a valid credit card number.", "error");
                        return;
                    }

                    // Luhn Algorithm validation check
                    let sum = 0;
                    let shouldDouble = false;
                    for (let i = cardNumber.length - 1; i >= 0; i--) {
                        let digit = parseInt(cardNumber.charAt(i));
                        if (shouldDouble) {
                            if ((digit *= 2) > 9) digit -= 9;
                        }
                        sum += digit;
                        shouldDouble = !shouldDouble;
                    }
                    if (sum % 10 !== 0) {
                        showToast("Invalid credit card number (Luhn check failed).", "error");
                        return;
                    }

                    // Expiration validation (MM/YY)
                    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
                        showToast("Expiry date must be in MM/YY format.", "error");
                        return;
                    }
                    const [expMonth, expYear] = expiry.split('/').map(Number);
                    if (expMonth < 1 || expMonth > 12) {
                        showToast("Expiry month must be between 01 and 12.", "error");
                        return;
                    }
                    const now = new Date();
                    const currentYear = now.getFullYear() % 100;
                    const currentMonth = now.getMonth() + 1;
                    if (expYear < currentYear || (expYear === currentYear && expMonth < currentMonth)) {
                        showToast("The card has expired.", "error");
                        return;
                    }

                    // CVV validation
                    if (cvv.length < 3 || cvv.length > 4 || !/^\d+$/.test(cvv)) {
                        showToast("Please enter a valid CVV (3-4 digits).", "error");
                        return;
                    }
                }

                const total = Shop.getCartSubtotal();
                
                const orderData = {
                    items: Shop.cart.map(item => ({
                        product_id: item.product_id,
                        quantity: item.quantity,
                        price: item.price
                    })),
                    shipping_details: {
                        name: shippingName,
                        address: shippingAddress,
                        city: shippingCity,
                        zip: shippingZip
                    },
                    payment_method: paymentMethod,
                    total: total
                };

                const submitBtn = document.getElementById('submit-order-btn');
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i class="fas fa-satellite-dish fa-spin"></i> TRANSMITTING DATA...';
                }

                try {
                    const result = await API.orders.create(orderData);
                    
                    if (result.success) {
                        // Clear checkout inputs and empty cart
                        checkoutForm.reset();
                        Shop.clearCart();
                        
                        // Show checkout success modal
                        this.showSuccessModal(result.order_id);
                    }
                } catch (err) {
                    showToast(err.message || "Order transaction failed.", "error");
                } finally {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'TRANSMIT ORDER';
                    }
                }
            });
        }

        // Close success modal button redirects to order history dashboard
        const closeSuccessBtn = document.getElementById('success-modal-close-btn');
        if (closeSuccessBtn) {
            closeSuccessBtn.addEventListener('click', () => {
                this.hideSuccessModal();
                window.location.hash = '#/dashboard';
            });
        }
    },

    showSuccessModal(orderId) {
        const backdrop = document.getElementById('checkout-success-backdrop');
        const modal = document.getElementById('checkout-success-modal');
        const orderIdText = document.getElementById('success-order-id');

        if (orderIdText) orderIdText.textContent = `#${String(orderId).padStart(5, '0')}`;
        
        if (backdrop && modal) {
            backdrop.classList.add('active');
            modal.classList.add('active');
        }
    },

    hideSuccessModal() {
        const backdrop = document.getElementById('checkout-success-backdrop');
        const modal = document.getElementById('checkout-success-modal');
        
        if (backdrop && modal) {
            backdrop.classList.remove('active');
            modal.classList.remove('active');
        }
    }
};

Checkout.init();
