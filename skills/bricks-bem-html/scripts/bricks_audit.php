<?php
/**
 * Site-wide audit against the skill rules: one row per Bricks document (pages, templates,
 * header/footer) with the counts that need work, plus all global-class CSS for bem_lint.py.
 *
 *   studio wp eval-file <skill>/scripts/bricks_audit.php <outDir>
 *   → <outDir>/docs.json, <outDir>/classes.css (then: curl the pages, bem_lint.py classes.css pages/)
 *
 * Columns: el elements · inst component instances · noLabel · noClass (no global class) ·
 * elStyle (style controls on the element) · elCss (element custom CSS) · cssCls (`_cssClasses`
 * strings) · icons (`data-icon` placeholders) · code (code/html/shortcode elements).
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit( "run through wp eval-file\n" );
}
global $wpdb;
$out = rtrim( $args[0] ?? '', '/\\' );
if ( '' === $out ) {
	exit( "usage: wp eval-file bricks_audit.php <outDir>\n" );
}
// wp_mkdir_p() refuses `..` segments; output folders usually sit next to the WordPress root.
if ( ! is_dir( $out ) && ! mkdir( $out, 0777, true ) ) {
	exit( "cannot create $out\n" );
}
$classes = (array) get_option( BRICKS_DB_GLOBAL_CLASSES, array() );
$byId    = array_column( $classes, null, 'id' );
$cats    = array_column( (array) get_option( BRICKS_DB_GLOBAL_CLASSES_CATEGORIES, array() ), 'name', 'id' );

$css = '';
foreach ( $classes as $c ) {
	$other = array_diff( array_keys( (array) ( $c['settings'] ?? array() ) ), array( '_cssCustom' ) );
	$css  .= "/* class: {$c['name']} | " . ( $cats[ $c['category'] ?? '' ] ?? '-' ) . ( $other ? ' | controls: ' . implode( ',', $other ) : '' ) . " */\n" . ( $c['settings']['_cssCustom'] ?? '' ) . "\n";
}
file_put_contents( "$out/classes.css", $css );

$rows = $wpdb->get_results( "SELECT p.ID, p.post_type, p.post_title, p.post_name, m.meta_key, m.meta_value FROM $wpdb->postmeta m JOIN $wpdb->posts p ON p.ID = m.post_id WHERE m.meta_key IN ('_bricks_page_content_2','_bricks_page_header_2','_bricks_page_footer_2') AND p.post_type <> 'revision' AND p.post_status IN ('publish','private','draft')" );
$keep = array( '_cssGlobalClasses', '_attributes', '_cssId', '_hidden', '_conditions', '_interactions', '_cssClasses' );
$docs = array();
foreach ( $rows as $r ) {
	$els = maybe_unserialize( $r->meta_value );
	if ( ! is_array( $els ) || ! $els ) {
		continue;
	}
	$d = array( 'id' => (int) $r->ID, 'type' => $r->post_type, 'slug' => $r->post_name, 'area' => str_replace( array( '_bricks_page_', '_2' ), '', $r->meta_key ),
		'url' => 'bricks_template' === $r->post_type ? '' : get_permalink( $r->ID ),
		'el' => count( $els ), 'inst' => 0, 'noLabel' => 0, 'noClass' => 0, 'elStyle' => 0, 'elCss' => 0, 'cssCls' => 0, 'icons' => 0, 'code' => 0, 'classes' => array() );
	foreach ( $els as $e ) {
		$s = (array) ( $e['settings'] ?? array() );
		if ( ! empty( $e['cid'] ) ) {
			++$d['inst'];
			continue;
		}
		$d['noLabel'] += empty( $e['label'] ) ? 1 : 0;
		$d['noClass'] += empty( $s['_cssGlobalClasses'] ) ? 1 : 0;
		foreach ( (array) ( $s['_cssGlobalClasses'] ?? array() ) as $id ) {
			$d['classes'][ $byId[ $id ]['name'] ?? "?$id" ] = true;
		}
		$d['elStyle'] += array_filter( array_keys( $s ), static fn( $k ) => str_starts_with( $k, '_' ) && ! in_array( $k, $keep, true ) && '_cssCustom' !== $k ) ? 1 : 0;
		$d['elCss']   += empty( $s['_cssCustom'] ) ? 0 : 1;
		$d['cssCls']  += empty( $s['_cssClasses'] ) ? 0 : 1;
		$d['icons']   += str_contains( wp_json_encode( $s ), 'data-icon' ) ? 1 : 0;
		$d['code']    += in_array( $e['name'], array( 'code', 'html', 'shortcode' ), true ) ? 1 : 0;
	}
	$d['classes'] = array_keys( $d['classes'] );
	$docs[]       = $d;
}
file_put_contents( "$out/docs.json", wp_json_encode( $docs, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) );
printf( "%-6s %-8s %-28s %4s %4s %7s %7s %7s %5s %6s %5s %4s\n", 'id', 'area', 'slug', 'el', 'inst', 'noLabel', 'noClass', 'elStyle', 'elCss', 'cssCls', 'icons', 'code' );
foreach ( $docs as $d ) {
	printf( "%-6d %-8s %-28s %4d %4d %7d %7d %7d %5d %6d %5d %4d\n", $d['id'], $d['area'], substr( $d['slug'], 0, 28 ), $d['el'], $d['inst'], $d['noLabel'], $d['noClass'], $d['elStyle'], $d['elCss'], $d['cssCls'], $d['icons'], $d['code'] );
}
printf( "%d documents, %d classes → %s\n", count( $docs ), count( $classes ), $out );
