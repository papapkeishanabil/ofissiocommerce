<?php

if (!defined('ABSPATH')) {
    exit;
}

class Ofissio_Commerce_Bridge_Product_Industry {
    public const TAXONOMY = 'product_industry';

    private const DEFAULT_TERMS = [
        'corporate' => 'Corporate',
        'mining' => 'Mining',
        'manufacturing' => 'Manufacturing',
        'hospitality' => 'Hospitality',
        'healthcare' => 'Healthcare',
        'education' => 'Education',
        'construction' => 'Construction',
        'logistics' => 'Logistics',
        'security' => 'Security',
        'government' => 'Government',
        'retail' => 'Retail',
        'food-beverage' => 'Food & Beverage',
        'bengkel' => 'Bengkel',
        'grosir' => 'Grosir',
        'laundry' => 'Laundry',
        'salon' => 'Salon',
        'bangunan' => 'Bangunan',
        'sparepart' => 'Sparepart',
        'petshop' => 'Petshop',
        'maritim' => 'Maritim',
    ];

    public static function init(): void {
        add_action('init', [self::class, 'register_taxonomy']);
        add_action('init', [self::class, 'maybe_seed_defaults'], 20);
        add_action('save_post_product', [self::class, 'sync_product_terms'], 20, 3);
    }

    public static function activate(): void {
        self::register_taxonomy();
        self::seed_defaults();
        flush_rewrite_rules();
    }

    public static function register_taxonomy(): void {
        register_taxonomy(self::TAXONOMY, ['product'], [
            'labels' => [
                'name' => 'Industries',
                'singular_name' => 'Industry',
                'menu_name' => 'Industries',
                'all_items' => 'All Industries',
                'edit_item' => 'Edit Industry',
                'add_new_item' => 'Add New Industry',
                'search_items' => 'Search Industries',
            ],
            'public' => true,
            'hierarchical' => false,
            'show_ui' => true,
            'show_admin_column' => true,
            'show_in_rest' => true,
            'rest_base' => 'product-industries',
            'rewrite' => ['slug' => 'industry'],
            'capabilities' => [
                'manage_terms' => 'manage_product_terms',
                'edit_terms' => 'edit_product_terms',
                'delete_terms' => 'delete_product_terms',
                'assign_terms' => 'assign_product_terms',
            ],
        ]);
    }

    public static function maybe_seed_defaults(): void {
        if (get_option('ofissio_industry_seed_version') === OFISSIO_COMMERCE_BRIDGE_VERSION) {
            return;
        }
        self::seed_defaults();
    }

    private static function seed_defaults(): void {
        foreach (self::DEFAULT_TERMS as $slug => $name) {
            if (!term_exists($slug, self::TAXONOMY)) {
                wp_insert_term($name, self::TAXONOMY, ['slug' => $slug]);
            }
        }
        $product_ids = get_posts([
            'post_type' => 'product',
            'post_status' => 'any',
            'fields' => 'ids',
            'posts_per_page' => -1,
            'meta_key' => 'industries',
        ]);
        foreach ($product_ids as $product_id) {
            $product = get_post((int) $product_id);
            if ($product instanceof WP_Post) {
                self::sync_product_terms((int) $product_id, $product, true);
            }
        }
        update_option('ofissio_industry_seed_version', OFISSIO_COMMERCE_BRIDGE_VERSION, false);
    }

    public static function sync_product_terms(int $post_id, WP_Post $post, bool $update): void {
        unset($post, $update);
        if (wp_is_post_revision($post_id) || wp_is_post_autosave($post_id)) {
            return;
        }
        $raw = get_post_meta($post_id, 'industries', true);
        if (is_string($raw)) {
            $decoded = json_decode($raw, true);
            $raw = is_array($decoded) ? $decoded : array_filter(array_map('trim', explode(',', $raw)));
        }
        if (!is_array($raw)) {
            return;
        }
        $term_ids = [];
        foreach ($raw as $value) {
            $slug = sanitize_title((string) $value);
            if ($slug === '') continue;
            $term = get_term_by('slug', $slug, self::TAXONOMY);
            if (!$term) {
                $created = wp_insert_term(ucwords(str_replace('-', ' ', $slug)), self::TAXONOMY, ['slug' => $slug]);
                if (!is_wp_error($created)) $term_ids[] = (int) $created['term_id'];
            } else {
                $term_ids[] = (int) $term->term_id;
            }
        }
        wp_set_object_terms($post_id, $term_ids, self::TAXONOMY, false);
    }
}
