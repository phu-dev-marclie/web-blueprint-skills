<?php
/**
 * Exports one Bricks area as a nested tree for conversion work (spec_skeleton.py turns it into
 * an editable spec_builder script):
 *   elements: [{name, label, classes: [names], settings (without _cssGlobalClasses), children,
 *               component?: label, properties?: {...}}]
 *   classes:  {name: {category, css, controls: [non-CSS setting keys]}}  — every class the area uses
 *
 *   studio wp eval-file <skill>/scripts/bricks_export.php <postId> <out.json> [header|footer|content]
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit( "run through wp eval-file\n" );
}
$postId = (int) ( $args[0] ?? 0 );
$out    = $args[1] ?? '';
if ( $postId <= 0 || '' === $out ) {
	exit( "usage: wp eval-file bricks_export.php <postId> <out.json> [area]\n" );
}
$area = $args[2] ?? '';
if ( '' === $area ) {
	$type = 'bricks_template' === get_post_type( $postId ) ? \Bricks\Templates::get_template_type( $postId ) : '';
	$area = in_array( $type, array( 'header', 'footer' ), true ) ? $type : 'content';
}
$els = get_post_meta( $postId, \Bricks\Database::get_bricks_data_key( $area ), true );
$els = is_array( $els ) ? $els : array(); // a page without Bricks data exports an empty tree

$classes = (array) get_option( BRICKS_DB_GLOBAL_CLASSES, array() );
$byId    = array_column( $classes, null, 'id' );
$cats    = array_column( (array) get_option( BRICKS_DB_GLOBAL_CLASSES_CATEGORIES, array() ), 'name', 'id' );
$comps   = array_column( (array) get_option( BRICKS_DB_COMPONENTS, array() ), null, 'id' );
$map     = array_column( $els, null, 'id' );
$used    = array();

$names = static function ( $ids ) use ( $byId, &$used ) {
	$out = array();
	foreach ( (array) $ids as $id ) {
		$n          = $byId[ $id ]['name'] ?? "?$id";
		$out[]      = $n;
		$used[ $n ] = $id;
	}
	return $out;
};
$walk = static function ( $id ) use ( &$walk, $map, $names, $comps ) {
	$e = $map[ $id ] ?? null;
	if ( ! $e ) {
		return null;
	}
	$s = (array) ( $e['settings'] ?? array() );
	$n = array(
		'name'     => $e['name'],
		'label'    => $e['label'] ?? '',
		'classes'  => $names( $s['_cssGlobalClasses'] ?? array() ),
		'settings' => (object) array_diff_key( $s, array( '_cssGlobalClasses' => 1 ) ),
		'children' => array(),
	);
	if ( ! empty( $e['cid'] ) ) {
		$n['component']  = $comps[ $e['cid'] ]['label'] ?? $e['cid'];
		$n['properties'] = (object) ( $e['properties'] ?? array() );
	}
	foreach ( (array) ( $e['children'] ?? array() ) as $c ) {
		$child = $walk( $c );
		if ( $child ) {
			$n['children'][] = $child;
		}
	}
	return $n;
};
$roots = array();
foreach ( $els as $e ) {
	if ( empty( $e['parent'] ) ) {
		$roots[] = $walk( $e['id'] );
	}
}
$classOut = array();
foreach ( $used as $name => $id ) {
	$c                 = $byId[ $id ] ?? array();
	$classOut[ $name ] = array(
		'category' => $cats[ $c['category'] ?? '' ] ?? '',
		'css'      => (string) ( $c['settings']['_cssCustom'] ?? '' ),
		'controls' => array_values( array_diff( array_keys( (array) ( $c['settings'] ?? array() ) ), array( '_cssCustom' ) ) ),
	);
}
ksort( $classOut );
file_put_contents( $out, wp_json_encode( array( 'postId' => $postId, 'area' => $area, 'title' => get_the_title( $postId ), 'elements' => $roots, 'classes' => $classOut ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) );
printf( "%s: %d elements, %d classes -> %s\n", get_the_title( $postId ), count( $els ), count( $classOut ), $out );
