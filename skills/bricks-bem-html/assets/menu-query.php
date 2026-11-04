<?php
/**
 * Bricks query type "WordPress menu": a query loop over the top-level items of a WordPress menu
 * (Appearance → Menus), picked in the loop element's "Menu" control (stored by menu slug).
 * Navigation lists (footer columns, legal links, simple header menus) are then edited in
 * WordPress, while Bricks owns only the markup + classes of ONE item.
 *
 * Copy into the child theme (e.g. inc/menu-query.php), require it from functions.php and rename
 * the `site_` prefix / tag names if the site already uses them.
 *
 * Inside the loop: {menu_item_title}, {menu_item_url}.
 */

defined( 'ABSPATH' ) || exit;

const SITE_MENU_QUERY = 'site_menu';

add_filter(
	'bricks/setup/control_options',
	static function ( $options ) {
		if ( is_array( $options ) ) {
			$options['queryTypes'][ SITE_MENU_QUERY ] = 'WordPress menu';
		}
		return $options;
	}
);

/** "Menu" select on loop-capable layout elements, visible when the loop type is a WordPress menu. */
$site_menu_control = static function ( array $controls ): array {
	$menus = [];
	foreach ( wp_get_nav_menus() as $menu ) {
		$menus[ $menu->slug ] = $menu->name;
	}
	$control = [
		'tab'         => 'content',
		'label'       => 'Menu',
		'type'        => 'select',
		'options'     => $menus,
		'placeholder' => 'Select menu',
		'description' => 'Top-level items of this WordPress menu. Inside the loop: {menu_item_title}, {menu_item_url}.',
		'required'    => [ [ 'hasLoop', '!=', '' ], [ 'query.objectType', '=', SITE_MENU_QUERY ] ],
		'rerender'    => true,
	];
	$out = [];
	foreach ( $controls as $key => $value ) {
		$out[ $key ] = $value;
		if ( 'query' === $key ) {
			$out['siteMenu'] = $control; // right below the query control
		}
	}
	$out['siteMenu'] = $out['siteMenu'] ?? $control;
	return $out;
};
foreach ( [ 'div', 'block', 'container', 'section' ] as $site_menu_element ) {
	add_filter( "bricks/elements/{$site_menu_element}/controls", $site_menu_control );
}

add_filter(
	'bricks/query/run',
	static function ( $result, $query ) {
		if ( SITE_MENU_QUERY !== ( $query->object_type ?? '' ) ) {
			return $result;
		}
		$slug  = (string) ( $query->settings['siteMenu'] ?? '' );
		$items = '' !== $slug ? wp_get_nav_menu_items( $slug ) : [];
		return array_values( array_filter( (array) $items, static fn( $item ): bool => $item instanceof WP_Post && ! (int) $item->menu_item_parent ) );
	},
	10,
	2
);

/** Menu item of the innermost running loop, if that loop is a WordPress-menu loop. */
function site_menu_loop_item(): ?WP_Post {
	if ( ! class_exists( '\Bricks\Query' ) ) {
		return null;
	}
	$id     = \Bricks\Query::is_any_looping();
	$object = $id ? \Bricks\Query::get_loop_object( $id ) : null;
	return $object instanceof WP_Post && 'nav_menu_item' === $object->post_type ? $object : null;
}

function site_menu_tag_value( string $tag ): ?string {
	$tag = trim( $tag, '{}' );
	if ( 'menu_item_title' !== $tag && 'menu_item_url' !== $tag ) {
		return null;
	}
	$item = site_menu_loop_item();
	if ( ! $item ) {
		return '';
	}
	return 'menu_item_title' === $tag ? (string) $item->title : (string) $item->url;
}

add_filter(
	'bricks/dynamic_tags_list',
	static function ( array $tags ): array {
		$tags[] = [ 'name' => '{menu_item_title}', 'label' => 'Menu item: title', 'group' => 'WordPress menu' ];
		$tags[] = [ 'name' => '{menu_item_url}', 'label' => 'Menu item: URL', 'group' => 'WordPress menu' ];
		return $tags;
	}
);

add_filter(
	'bricks/dynamic_data/render_tag',
	static function ( $tag, $post, $context = 'text' ) {
		$value = is_string( $tag ) ? site_menu_tag_value( $tag ) : null;
		return null === $value ? $tag : $value;
	},
	20,
	3
);

$site_menu_render_content = static function ( $content, $post, $context = 'text' ) {
	if ( ! is_string( $content ) || false === strpos( $content, '{menu_item_' ) ) {
		return $content;
	}
	foreach ( [ 'menu_item_title', 'menu_item_url' ] as $tag ) {
		$content = str_replace( '{' . $tag . '}', (string) site_menu_tag_value( $tag ), $content );
	}
	return $content;
};
add_filter( 'bricks/dynamic_data/render_content', $site_menu_render_content, 20, 3 );
add_filter( 'bricks/frontend/render_data', $site_menu_render_content, 20, 2 );
