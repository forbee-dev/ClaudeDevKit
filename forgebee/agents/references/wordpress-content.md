# wordpress-content — Reference Material

Sections extracted from `forgebee/agents/wordpress-content.md` to keep the persona file under the 250-line budget. The agent file holds discipline and Never rules — this file holds the working library.

---

## WordPress Content Patterns

### Gutenberg Block Content

```html
<!-- wp:heading {"level":2} -->
<h2 class="wp-block-heading">Why Choose Our Service</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>Lead with the benefit. Every sentence earns the next.</p>
<!-- /wp:paragraph -->

<!-- wp:columns -->
<div class="wp-block-columns">
    <!-- wp:column -->
    <div class="wp-block-column">
        <!-- wp:heading {"level":3} -->
        <h3>Feature One</h3>
        <!-- /wp:heading -->
        <!-- wp:paragraph -->
        <p>Benefit-driven description of this feature.</p>
        <!-- /wp:paragraph -->
    </div>
    <!-- /wp:column -->
    <!-- wp:column -->
    <div class="wp-block-column">
        <!-- wp:heading {"level":3} -->
        <h3>Feature Two</h3>
        <!-- /wp:heading -->
        <!-- wp:paragraph -->
        <p>Benefit-driven description of this feature.</p>
        <!-- /wp:paragraph -->
    </div>
    <!-- /wp:column -->
</div>
<!-- /wp:columns -->

<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->
<div class="wp-block-buttons">
    <!-- wp:button {"className":"is-style-fill"} -->
    <div class="wp-block-button is-style-fill">
        <a class="wp-block-button__link wp-element-button" href="/contact">Get Started Today</a>
    </div>
    <!-- /wp:button -->
</div>
<!-- /wp:buttons -->
```

### Block Patterns (Reusable Templates)

```php
// Register a reusable content pattern
register_block_pattern(
    'theme/testimonial-section',
    [
        'title'       => 'Testimonial Section',
        'description' => 'Customer testimonial with photo and quote',
        'categories'  => [ 'social-proof' ],
        'content'     => '<!-- wp:group {"className":"testimonial-section"} -->
<div class="wp-block-group testimonial-section">
    <!-- wp:image {"className":"testimonial-photo","width":"80","height":"80"} -->
    <figure class="wp-block-image testimonial-photo">
        <img src="" alt="Customer photo" width="80" height="80"/>
    </figure>
    <!-- /wp:image -->
    <!-- wp:quote -->
    <blockquote class="wp-block-quote">
        <p>Customer testimonial quote goes here.</p>
        <cite>Customer Name, Company</cite>
    </blockquote>
    <!-- /wp:quote -->
</div>
<!-- /wp:group -->',
    ]
);
```

### ACF Flexible Content

When writing content for ACF flexible content layouts, structure as PHP data:

```php
// Content structure for ACF flexible content field 'page_sections'
$content_plan = [
    [
        'acf_fc_layout' => 'hero_section',
        'heading'       => 'Ship Faster, Break Nothing',
        'subheading'    => 'The deployment platform that gives you confidence.',
        'cta_text'      => 'Start Free Trial',
        'cta_url'       => '/signup',
        'background'    => 'gradient-blue',
    ],
    [
        'acf_fc_layout' => 'features_grid',
        'heading'       => 'Everything You Need',
        'features'      => [
            [
                'icon'        => 'rocket',
                'title'       => 'Zero-Downtime Deploys',
                'description' => 'Push to production without interrupting users.',
            ],
            [
                'icon'        => 'shield',
                'title'       => 'Automatic Rollbacks',
                'description' => 'Something breaks? We roll back in seconds.',
            ],
            [
                'icon'        => 'chart',
                'title'       => 'Real-Time Monitoring',
                'description' => 'See every deploy\'s impact on performance.',
            ],
        ],
    ],
    [
        'acf_fc_layout'  => 'testimonial_slider',
        'testimonials'   => [
            [
                'quote'   => 'We cut deploy time from 45 minutes to 90 seconds.',
                'name'    => 'Sarah Chen',
                'role'    => 'CTO, StartupCo',
                'company' => 'StartupCo',
            ],
        ],
    ],
    [
        'acf_fc_layout' => 'cta_section',
        'heading'       => 'Ready to Ship with Confidence?',
        'cta_text'      => 'Start Your Free Trial',
        'cta_url'       => '/signup',
    ],
];
```

### WooCommerce Product Content

```php
// Product description structure
$product_content = [
    'title'             => 'Premium Wireless Headphones',
    'short_description' => 'Crystal-clear audio with 30-hour battery life. Active noise cancellation for deep focus.', // Shows next to price
    'description'       => '', // Full description below — use Gutenberg blocks
    'features'          => [
        '30-hour battery life',
        'Active noise cancellation',
        'Bluetooth 5.3',
        'Foldable design',
    ],
];

// Long description as Gutenberg blocks
$long_description = '
<!-- wp:heading {"level":2} -->
<h2>Immersive Sound, All Day</h2>
<!-- /wp:heading -->

<!-- wp:paragraph -->
<p>Engineered for professionals who demand crystal-clear audio during long work sessions.</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":3} -->
<h3>What\'s in the Box</h3>
<!-- /wp:heading -->

<!-- wp:list -->
<ul>
    <li>Premium Wireless Headphones</li>
    <li>USB-C charging cable</li>
    <li>3.5mm audio cable</li>
    <li>Carrying case</li>
</ul>
<!-- /wp:list -->
';
```

### WordPress Excerpt Best Practices

```php
// Custom excerpt for SEO (shows in archives, search, meta description)
// Manual excerpt in editor: 150-160 chars, includes primary keyword, ends with value prop

// Programmatic excerpt enhancement
add_filter( 'get_the_excerpt', function( $excerpt, $post ) {
    if ( empty( $excerpt ) ) {
        // Auto-generate from ACF intro field if available
        $intro = get_field( 'intro_text', $post->ID );
        if ( $intro ) {
            return wp_trim_words( wp_strip_all_tags( $intro ), 25 );
        }
    }
    return $excerpt;
}, 10, 2 );
```


## Content Guidelines for WordPress

1. **Block editor content** — use proper block markup (`<!-- wp:... -->`) not raw HTML
2. **Headings** — H2 for sections, H3 for subsections (H1 is the page title)
3. **Images** — always include `alt` text, use WordPress image sizes (`medium`, `large`)
4. **CTAs** — use `wp:buttons` block, not raw `<a>` tags
5. **Lists** — use `wp:list` block for proper block editor editing
6. **Short descriptions** — 1-2 sentences, benefit-driven, include primary keyword
7. **Excerpts** — 150-160 chars, includes keyword, standalone readable
8. **ACF content** — structure matches the field group exactly, no missing required fields

