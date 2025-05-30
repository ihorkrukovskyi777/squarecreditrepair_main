jQuery(document).ready(function($) {
    // Initialize Stripe
    const stripe = Stripe(stripe_vars.public_key);
    const elements = stripe.elements();

    // Create card element
    const card = elements.create('card', {
        style: {
            base: {
                fontSize: '16px',
                color: '#32325d',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                '::placeholder': {
                    color: '#aab7c4'
                }
            },
            invalid: {
                color: '#fa755a',
                iconColor: '#fa755a'
            }
        }
    });

    // Mount the card element
    card.mount('#card-element');

    // Handle real-time validation errors
    card.addEventListener('change', function(event) {
        const displayError = document.getElementById('card-errors');
        if (event.error) {
            displayError.textContent = event.error.message;
        } else {
            displayError.textContent = '';
        }
    });

    // Handle form submission
    const form = document.getElementById('payment-form');
    form.addEventListener('submit', async function(event) {
        event.preventDefault();

        const submitButton = document.getElementById('submit-button');
        const amountInput = document.getElementById('amount');
        
        // Validate amount
        const amount = parseFloat(amountInput.value);
        if (isNaN(amount) || amount <= 0) {
            const errorElement = document.getElementById('card-errors');
            errorElement.textContent = 'Please enter a valid amount';
            return;
        }

        // Convert amount to cents
        const amountInCents = Math.round(amount * 100);

        submitButton.disabled = true;

        try {
            const {paymentMethod, error} = await stripe.createPaymentMethod({
                type: 'card',
                card: card,
            });

            if (error) {
                const errorElement = document.getElementById('card-errors');
                errorElement.textContent = error.message;
                submitButton.disabled = false;
                return;
            }

            // Send payment method ID to server
            $.ajax({
                url: stripe_vars.ajax_url,
                type: 'POST',
                data: {
                    action: 'process_stripe_payment',
                    payment_method_id: paymentMethod.id,
                    amount: amountInCents,
                    nonce: stripe_vars.nonce
                },
                success: function(response) {
                    if (response.success) {
                        // Handle successful payment
                        const {client_secret} = response.data;
                        stripe.confirmCardPayment(client_secret).then(function(result) {
                            if (result.error) {
                                const errorElement = document.getElementById('card-errors');
                                errorElement.textContent = result.error.message;
                                submitButton.disabled = false;
                            } else {
                                // Payment successful
                                form.submit();
                            }
                        });
                    } else {
                        const errorElement = document.getElementById('card-errors');
                        errorElement.textContent = response.data.error;
                        submitButton.disabled = false;
                    }
                },
                error: function() {
                    const errorElement = document.getElementById('card-errors');
                    errorElement.textContent = 'An error occurred. Please try again.';
                    submitButton.disabled = false;
                }
            });
        } catch (err) {
            const errorElement = document.getElementById('card-errors');
            errorElement.textContent = err.message;
            submitButton.disabled = false;
        }
    });
}); 