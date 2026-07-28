<?php

if (!defined('ABSPATH')) {
    exit;
}

class Ofissio_Commerce_Bridge_Product_Meta {
    public const REQUIRED_KEYS = [
        'model_3d_url',
        'model_3d_id',
        'model_3d_version',
        'model_3d_source',
        'model_3d_filename',
        'has_3d_model',
        'moq',
        'lead_time',
        'fulfillment_type',
        'transaction_mode',
        'industries',
    ];

    public static function init(): void {
        // Phase 8 skeleton. Future: register_post_meta definitions.
    }

    public static function is_valid_glb_meta(int $product_id): bool {
        $url = (string) get_post_meta($product_id, 'model_3d_url', true);
        $filename = (string) get_post_meta($product_id, 'model_3d_filename', true);
        $has_model = filter_var(get_post_meta($product_id, 'has_3d_model', true), FILTER_VALIDATE_BOOLEAN);

        return $has_model
            && str_ends_with(strtolower($url), '.glb')
            && str_ends_with(strtolower($filename), '.glb');
    }
}
