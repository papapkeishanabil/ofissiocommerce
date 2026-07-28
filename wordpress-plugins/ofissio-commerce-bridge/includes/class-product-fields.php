<?php

if (!defined('ABSPATH')) {
    exit;
}

class Ofissio_Commerce_Bridge_Product_Fields {
    public static function init(): void {
        // Phase 8 skeleton only. Future: render WooCommerce admin fields and save meta.
        add_action('woocommerce_product_options_general_product_data', [self::class, 'render_placeholder']);
    }

    public static function render_placeholder(): void {
        if (!Ofissio_Commerce_Bridge_Security::can_manage_product()) {
            return;
        }

        echo '<div class="options_group">';
        echo '<p class="form-field"><strong>Ofissio 3D Fields</strong><br />';
        echo '<span class="description">Skeleton aktif. Field UI lengkap dibuat pada fase bridge plugin berikutnya.</span></p>';
        echo '</div>';
    }
}
