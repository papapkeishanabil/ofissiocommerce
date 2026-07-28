<?php

if (!defined('ABSPATH')) {
    exit;
}

class Ofissio_Commerce_Bridge_Security {
    public static function init(): void {
        // Phase 8 skeleton. Future: nonce/capability helpers for custom admin UI.
    }

    public static function can_manage_product(): bool {
        return current_user_can('manage_woocommerce') || current_user_can('edit_products');
    }
}
