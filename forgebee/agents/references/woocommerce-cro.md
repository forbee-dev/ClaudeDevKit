# woocommerce-cro — Reference Material

Sections extracted from `forgebee/agents/woocommerce-cro.md` to keep the persona under the 250-line budget. Persona file holds discipline + Never rules.

---

## WooCommerce CRO Patterns

### Checkout Optimization

```php
// Remove unnecessary checkout fields
add_filter( 'woocommerce_checkout_fields', function( $fields ) {
    // Remove company field (reduces friction)
    unset( $fields['billing']['billing_company'] );
    // Remove order notes (rarely useful)
    unset( $fields['order']['order_comments'] );
    // Make phone optional
    $fields['billing']['billing_phone']['required'] = false;
    return $fields;
});

// Add trust signals above payment
add_action( 'woocommerce_review_order_before_payment', function() {
    echo '<div class="checkout-trust-signals">';
    echo '<p>🔒 Secure 256-bit SSL encryption</p>';
    echo '<p>💳 30-day money-back guarantee</p>';
    echo '<p>📦 Free shipping on orders over $50</p>';
    echo '</div>';
});

// Express checkout (skip cart page)
add_filter( 'woocommerce_add_to_cart_redirect', function( $url ) {
    return wc_get_checkout_url();
});

// Guest checkout (don't require account)
// In wp-admin: WooCommerce > Settings > Accounts
// Or programmatically:
add_filter( 'pre_option_woocommerce_enable_guest_checkout', function() {
    return 'yes';
});
```

### Product Page Conversion

```php
// Add urgency/scarcity below price
add_action( 'woocommerce_single_product_summary', function() {
    global $product;
    $stock = $product->get_stock_quantity();
    if ( $stock && $stock <= 10 && $stock > 0 ) {
        echo '<p class="low-stock-urgency">Only ' . esc_html( $stock ) . ' left in stock!</p>';
    }
}, 15 ); // After price (priority 10)

// Add social proof below add-to-cart
add_action( 'woocommerce_after_add_to_cart_form', function() {
    global $product;
    $sold = get_post_meta( $product->get_id(), 'total_sales', true );
    if ( $sold > 100 ) {
        echo '<p class="social-proof">' . number_format( $sold ) . '+ customers bought this</p>';
    }
});

// Trust badges below add-to-cart button
add_action( 'woocommerce_after_add_to_cart_button', function() {
    echo '<div class="trust-badges">';
    echo '<span>✓ Free Returns</span>';
    echo '<span>✓ Secure Payment</span>';
    echo '<span>✓ Fast Shipping</span>';
    echo '</div>';
});

// Sticky add-to-cart on mobile
add_action( 'woocommerce_after_single_product', function() {
    global $product;
    if ( ! $product->is_in_stock() ) return;
    ?>
    <div class="sticky-add-to-cart" style="display:none;">
        <span class="product-title"><?php echo esc_html( $product->get_name() ); ?></span>
        <span class="product-price"><?php echo $product->get_price_html(); ?></span>
        <a href="#product-<?php echo esc_attr( $product->get_id() ); ?>" class="button">Add to Cart</a>
    </div>
    <?php
});
```

### Cart Recovery

```php
// Save cart for logged-in users (persistent cart)
add_filter( 'woocommerce_persistent_cart_enabled', '__return_true' );

// Add "Save for Later" to cart items
add_action( 'woocommerce_after_cart_item_name', function( $cart_item, $cart_item_key ) {
    echo '<a href="#" class="save-for-later" data-key="' . esc_attr( $cart_item_key ) . '">Save for later</a>';
}, 10, 2 );

// Cart abandonment — show mini-cart on exit intent (JS-based)
add_action( 'wp_footer', function() {
    if ( ! WC()->cart || WC()->cart->is_empty() ) return;
    ?>
    <script>
    document.addEventListener('mouseout', function(e) {
        if (e.clientY < 10 && !sessionStorage.getItem('exitShown')) {
            // Show exit-intent modal with cart contents
            document.querySelector('.exit-intent-modal')?.classList.add('active');
            sessionStorage.setItem('exitShown', '1');
        }
    });
    </script>
    <?php
});

// Free shipping threshold notice
add_action( 'woocommerce_before_cart', function() {
    $threshold = 50;
    $current   = WC()->cart->get_subtotal();
    $remaining = $threshold - $current;
    if ( $remaining > 0 ) {
        echo '<div class="free-shipping-notice">';
        echo 'Add ' . wc_price( $remaining ) . ' more for <strong>FREE shipping</strong>!';
        echo '</div>';
    }
});
```

### Cross-sell and Upsell Optimization

```php
// Move cross-sells to checkout (not just cart)
add_action( 'woocommerce_after_checkout_form', function() {
    $cross_sells = WC()->cart->get_cross_sells();
    if ( empty( $cross_sells ) ) return;

    $products = wc_get_products([
        'include' => $cross_sells,
        'limit'   => 3,
    ]);

    echo '<div class="checkout-cross-sells">';
    echo '<h3>Customers also bought</h3>';
    foreach ( $products as $product ) {
        echo '<div class="cross-sell-item">';
        echo '<img src="' . esc_url( wp_get_attachment_url( $product->get_image_id() ) ) . '" />';
        echo '<p>' . esc_html( $product->get_name() ) . ' — ' . $product->get_price_html() . '</p>';
        echo '<a href="' . esc_url( $product->add_to_cart_url() ) . '" class="button">Add</a>';
        echo '</div>';
    }
    echo '</div>';
});

// Order bump on checkout
add_action( 'woocommerce_review_order_before_submit', function() {
    $bump_product_id = get_option( 'order_bump_product_id' );
    if ( ! $bump_product_id ) return;
    $product = wc_get_product( $bump_product_id );
    if ( ! $product ) return;

    echo '<div class="order-bump">';
    echo '<label>';
    echo '<input type="checkbox" name="add_order_bump" value="' . esc_attr( $bump_product_id ) . '" />';
    echo ' Add <strong>' . esc_html( $product->get_name() ) . '</strong> for just ' . $product->get_price_html();
    echo '</label>';
    echo '</div>';
});
```

### Payment UX

```php
// Reorder payment gateways (most popular first)
add_filter( 'woocommerce_payment_gateways', function( $gateways ) {
    // Stripe first, then PayPal, then others
    usort( $gateways, function( $a, $b ) {
        $order = [ 'stripe' => 1, 'ppcp-gateway' => 2 ];
        $a_id  = is_string( $a ) ? $a : $a->id ?? '';
        $b_id  = is_string( $b ) ? $b : $b->id ?? '';
        return ( $order[ $a_id ] ?? 99 ) <=> ( $order[ $b_id ] ?? 99 );
    });
    return $gateways;
});

// Show accepted payment icons
add_action( 'woocommerce_review_order_after_submit', function() {
    echo '<div class="accepted-payments">';
    echo '<p>We accept:</p>';
    echo '<img src="' . esc_url( get_template_directory_uri() . '/assets/payment-icons.svg' ) . '" alt="Visa, Mastercard, PayPal, Apple Pay" />';
    echo '</div>';
});
```

