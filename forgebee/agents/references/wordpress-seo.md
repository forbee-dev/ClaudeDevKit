# wordpress-seo — Reference Material

Sections extracted from `forgebee/agents/wordpress-seo.md` to keep the persona under the 250-line budget. Persona file holds discipline + Never rules.

---

## WordPress SEO Patterns

### Yoast SEO Programmatic Control

```php
// Set meta title/description programmatically
add_filter( 'wpseo_title', function( $title ) {
    if ( is_post_type_archive( 'product' ) ) {
        return 'Shop All Products | ' . get_bloginfo( 'name' );
    }
    return $title;
});

add_filter( 'wpseo_metadesc', function( $desc ) {
    if ( is_singular( 'product' ) ) {
        $short = get_post_meta( get_the_ID(), '_short_description', true );
        return wp_trim_words( $short, 25 );
    }
    return $desc;
});

// Add custom schema
add_filter( 'wpseo_schema_graph_pieces', function( $pieces, $context ) {
    $pieces[] = new My_Custom_Schema_Piece( $context );
    return $pieces;
}, 10, 2 );
```

### RankMath Programmatic Control

```php
// Change title via RankMath
add_filter( 'rank_math/frontend/title', function( $title ) {
    if ( is_post_type_archive( 'product' ) ) {
        return 'Shop All Products | ' . get_bloginfo( 'name' );
    }
    return $title;
});

// Add JSON-LD via RankMath
add_filter( 'rank_math/json_ld', function( $data, $jsonld ) {
    if ( is_singular( 'product' ) ) {
        $data['product'] = [
            '@type'  => 'Product',
            'name'   => get_the_title(),
            'offers' => [
                '@type' => 'Offer',
                'price' => get_post_meta( get_the_ID(), '_price', true ),
            ],
        ];
    }
    return $data;
}, 10, 2 );
```

### WordPress XML Sitemap Customization

```php
// Add custom post types to sitemap (WP 5.5+ core sitemaps)
add_filter( 'wp_sitemaps_post_types', function( $post_types ) {
    unset( $post_types['attachment'] ); // Remove attachments
    return $post_types;
});

// Exclude specific posts
add_filter( 'wp_sitemaps_posts_query_args', function( $args, $post_type ) {
    if ( $post_type === 'page' ) {
        $args['post__not_in'] = [ get_option( 'page_on_front' ) ];
    }
    return $args;
}, 10, 2 );

// Add custom entries (Yoast)
add_filter( 'wpseo_sitemap_index', function( $sitemap_custom_items ) {
    $sitemap_custom_items .= '
    <sitemap>
        <loc>' . home_url( '/custom-sitemap.xml' ) . '</loc>
        <lastmod>' . date( 'c' ) . '</lastmod>
    </sitemap>';
    return $sitemap_custom_items;
});
```

### WordPress Permalink Structure

```php
// Custom post type with SEO-friendly rewrite
register_post_type( 'service', [
    'rewrite' => [
        'slug'       => 'services',    // /services/service-name/
        'with_front' => false,          // Don't prepend /blog/ if set as front
    ],
    'has_archive'   => 'services',     // /services/ archive page
    'hierarchical'  => false,
]);

// Custom taxonomy with SEO-friendly rewrite
register_taxonomy( 'service_category', 'service', [
    'rewrite' => [
        'slug'         => 'services/category',
        'with_front'   => false,
        'hierarchical' => true,
    ],
]);

// Flush rewrite rules on activation only
register_activation_hook( __FILE__, function() {
    // Register CPTs first, then flush
    register_custom_post_types();
    flush_rewrite_rules();
});
```

### WooCommerce Product Schema

```php
// Enhanced product schema
add_filter( 'woocommerce_structured_data_product', function( $markup, $product ) {
    // Add brand
    $brand = get_term( get_post_meta( $product->get_id(), '_brand', true ), 'product_brand' );
    if ( $brand && ! is_wp_error( $brand ) ) {
        $markup['brand'] = [
            '@type' => 'Brand',
            'name'  => $brand->name,
        ];
    }

    // Add GTIN/SKU
    if ( $product->get_sku() ) {
        $markup['sku']  = $product->get_sku();
        $markup['gtin'] = $product->get_sku(); // If SKU is GTIN
    }

    // Availability mapping
    $markup['offers']['availability'] = $product->is_in_stock()
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock';

    return $markup;
}, 10, 2 );
```

### ACF Content SEO

```php
// Include ACF fields in Yoast content analysis
add_filter( 'wpseo_pre_analysis_post_content', function( $content, $post ) {
    // Add ACF flexible content to analysis
    if ( have_rows( 'page_sections', $post->ID ) ) {
        while ( have_rows( 'page_sections', $post->ID ) ) {
            the_row();
            $content .= ' ' . get_sub_field( 'heading' );
            $content .= ' ' . get_sub_field( 'content' );
        }
    }
    return $content;
}, 10, 2 );

// Generate FAQ schema from ACF repeater
function generate_faq_schema_from_acf( $post_id ) {
    $faq_items = [];
    if ( have_rows( 'faq', $post_id ) ) {
        while ( have_rows( 'faq', $post_id ) ) {
            the_row();
            $faq_items[] = [
                '@type'          => 'Question',
                'name'           => get_sub_field( 'question' ),
                'acceptedAnswer' => [
                    '@type' => 'Answer',
                    'text'  => wp_strip_all_tags( get_sub_field( 'answer' ) ),
                ],
            ];
        }
    }

    if ( ! empty( $faq_items ) ) {
        return [
            '@context'   => 'https://schema.org',
            '@type'      => 'FAQPage',
            'mainEntity' => $faq_items,
        ];
    }
    return null;
}
```

