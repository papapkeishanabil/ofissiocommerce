<?php

if (!defined('ABSPATH')) {
    exit;
}

class Ofissio_Commerce_Bridge_REST_API {
    public static function init(): void {
        add_action('rest_api_init', [self::class, 'register_routes']);
    }

    public static function register_routes(): void {
        register_rest_route('ofissio/v1', '/health', [
            'methods' => 'GET',
            'callback' => [self::class, 'health'],
            'permission_callback' => '__return_true',
        ]);
        register_rest_route('ofissio/v1', '/variation-raw-skus/(?P<product_id>\d+)', [
            'methods' => 'GET',
            'callback' => [self::class, 'variation_raw_skus'],
            'permission_callback' => static function (): bool {
                return current_user_can('manage_woocommerce');
            },
            'args' => [
                'product_id' => ['required' => true, 'sanitize_callback' => 'absint'],
                'variation_id' => ['required' => false, 'sanitize_callback' => 'absint'],
            ],
        ]);
    }

    public static function health(): array {
        return [
            'ok' => true,
            'plugin' => 'ofissio-commerce-bridge',
            'version' => OFISSIO_COMMERCE_BRIDGE_VERSION,
        ];
    }

    public static function variation_raw_skus(WP_REST_Request $request) {
        $product_id = absint($request['product_id']);
        $parent = wc_get_product($product_id);
        if (!$parent || !$parent->is_type('variable')) {
            return new WP_Error('ofissio_product_not_variable', 'Variable product not found.', ['status' => 404]);
        }

        $requested_variation_id = absint($request->get_param('variation_id'));
        $variation_ids = $requested_variation_id ? [$requested_variation_id] : $parent->get_children();
        $items = [];
        foreach ($variation_ids as $variation_id) {
            $variation = wc_get_product($variation_id);
            if (!$variation || !$variation->is_type('variation') || $variation->get_parent_id() !== $product_id) {
                continue;
            }
            $display_sku = (string) $variation->get_sku('view');
            $raw_sku = (string) $variation->get_sku('edit');
            $items[] = [
                'variationId' => $variation->get_id(),
                'displaySku' => $display_sku,
                'rawSku' => $raw_sku,
                'inheritedFromParent' => $raw_sku === '' && $display_sku !== '',
            ];
        }
        return ['productId' => $product_id, 'items' => $items];
    }
}
