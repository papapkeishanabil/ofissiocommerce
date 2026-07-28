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
    }

    public static function health(): array {
        return [
            'ok' => true,
            'plugin' => 'ofissio-commerce-bridge',
            'version' => OFISSIO_COMMERCE_BRIDGE_VERSION,
        ];
    }
}
