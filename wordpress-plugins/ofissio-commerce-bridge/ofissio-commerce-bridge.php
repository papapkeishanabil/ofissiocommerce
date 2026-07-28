<?php
/**
 * Plugin Name: Ofissio Commerce Bridge
 * Description: Skeleton bridge for Ofissio headless WooCommerce product fields.
 * Version: 0.1.0
 * Author: Ofissio
 * Requires PHP: 8.0
 */

if (!defined('ABSPATH')) {
    exit;
}

define('OFISSIO_COMMERCE_BRIDGE_VERSION', '0.1.0');
define('OFISSIO_COMMERCE_BRIDGE_PATH', plugin_dir_path(__FILE__));

require_once OFISSIO_COMMERCE_BRIDGE_PATH . 'includes/class-security.php';
require_once OFISSIO_COMMERCE_BRIDGE_PATH . 'includes/class-product-meta.php';
require_once OFISSIO_COMMERCE_BRIDGE_PATH . 'includes/class-product-fields.php';
require_once OFISSIO_COMMERCE_BRIDGE_PATH . 'includes/class-rest-api.php';

add_action('plugins_loaded', function () {
    if (!class_exists('WooCommerce')) {
        return;
    }

    Ofissio_Commerce_Bridge_Security::init();
    Ofissio_Commerce_Bridge_Product_Meta::init();
    Ofissio_Commerce_Bridge_Product_Fields::init();
    Ofissio_Commerce_Bridge_REST_API::init();
});
