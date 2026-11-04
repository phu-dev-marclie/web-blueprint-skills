<?php
/**
 * Renames design tokens (CSS custom properties) everywhere Bricks stores them, keeping every
 * value and every internal id: global variables (name + values), Color Manager palettes (raw,
 * light, dark), global classes, theme styles, components, and the element trees of every
 * Bricks document (saved through Save_Pipeline). A reference is renamed only when the whole
 * name matches the map (`--fs-sm` never touches `--fs-sm-x`).
 *
 *   studio wp eval-file <skill>/scripts/bricks_token_rename.php <map.json> <backupDir> [dry]
 *   map.json: {"old-name": "new-name", …} without the leading `--`
 *
 * Afterwards: rename the same tokens in theme/plugin files (scripts/token_rename.py), update the
 * tokens spec to the new names and re-apply it (scale prefixes / step names), pixel-diff the site.
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit( "run through wp eval-file\n" );
}
$map = is_readable( $args[0] ?? '' ) ? json_decode( (string) file_get_contents( $args[0] ), true ) : null;
$dir = $args[1] ?? '';
$dry = in_array( 'dry', $args, true );
if ( ! is_array( $map ) || ! $map || '' === $dir ) {
	exit( "usage: wp eval-file bricks_token_rename.php <map.json> <backupDir> [dry]\n" );
}
if ( count( array_unique( $map ) ) !== count( $map ) ) {
	exit( "abort: map has duplicate targets\n" );
}
// Chains (old A → B while old B → C) are fine in this single pass, but a second run would rename
// again: refuse when a target that is not also a source already exists as a variable or colour.
$existing = array_column( (array) get_option( BRICKS_DB_GLOBAL_VARIABLES, array() ), 'name' );
foreach ( (array) get_option( BRICKS_DB_COLOR_PALETTE, array() ) as $p ) {
	foreach ( (array) ( $p['colors'] ?? array() ) as $c ) {
		if ( preg_match( '/^var\(--([\w-]+)\)$/', (string) ( $c['raw'] ?? '' ), $m ) ) {
			$existing[] = $m[1];
		}
	}
}
$applied = array_intersect( array_diff( array_values( $map ), array_keys( $map ) ), $existing );
if ( $applied ) {
	exit( 'abort: already renamed (targets exist: ' . implode( ', ', array_slice( $applied, 0, 5 ) ) . ")\n" );
}

$hits = array();
$rename_str = static function ( string $s ) use ( $map, &$hits ): string {
	return preg_replace_callback(
		'/(?<![\w-])--([a-zA-Z][\w-]*)/',
		static function ( $m ) use ( $map, &$hits ) {
			if ( ! isset( $map[ $m[1] ] ) ) {
				return $m[0];
			}
			$hits[ $m[1] ] = ( $hits[ $m[1] ] ?? 0 ) + 1;
			return '--' . $map[ $m[1] ];
		},
		$s
	);
};
$walk = static function ( $v ) use ( &$walk, $rename_str ) {
	if ( is_string( $v ) ) {
		return $rename_str( $v );
	}
	if ( is_array( $v ) ) {
		$out = array();
		foreach ( $v as $k => $x ) {
			$out[ $k ] = $walk( $x );
		}
		return $out;
	}
	return $v;
};

// ---------------------------------------------------------------- backup
global $wpdb;
$options = array( BRICKS_DB_GLOBAL_VARIABLES, BRICKS_DB_GLOBAL_VARIABLES_CATEGORIES, BRICKS_DB_COLOR_PALETTE, BRICKS_DB_GLOBAL_CLASSES, BRICKS_DB_THEME_STYLES, BRICKS_DB_COMPONENTS );
$docs    = $wpdb->get_results( "SELECT m.post_id, m.meta_key FROM $wpdb->postmeta m JOIN $wpdb->posts p ON p.ID = m.post_id WHERE m.meta_key IN ('_bricks_page_content_2','_bricks_page_header_2','_bricks_page_footer_2') AND p.post_type <> 'revision'" );
if ( ! $dry ) {
	if ( ! is_dir( $dir ) && ! mkdir( $dir, 0777, true ) ) {
		exit( "cannot create $dir\n" );
	}
	$backup = array( 'options' => array(), 'docs' => array() );
	foreach ( $options as $o ) {
		$backup['options'][ $o ] = get_option( $o );
	}
	foreach ( $docs as $d ) {
		$backup['docs'][ $d->post_id ][ $d->meta_key ] = get_post_meta( $d->post_id, $d->meta_key, true );
	}
	$file = rtrim( $dir, '/\\' ) . '/' . gmdate( 'Ymd-His' ) . '-token-rename.json';
	file_put_contents( $file, wp_json_encode( $backup, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) );
	echo "backup: $file\n";
}

// ---------------------------------------------------------------- options
foreach ( $options as $o ) {
	$val = get_option( $o, array() );
	$new = $walk( $val );
	if ( BRICKS_DB_GLOBAL_VARIABLES === $o ) {
		foreach ( $new as &$v ) {
			if ( isset( $v['name'], $map[ $v['name'] ] ) ) {
				$hits[ $v['name'] ] = ( $hits[ $v['name'] ] ?? 0 ) + 1;
				$v['name']          = $map[ $v['name'] ];
			}
		}
		unset( $v );
	}
	if ( $new !== $val && ! $dry ) {
		update_option( $o, $new );
	}
	echo ( $new !== $val ? 'changed' : 'unchanged' ) . " option $o\n";
}

// ---------------------------------------------------------------- documents (Save_Pipeline keeps Bricks' caches + revisions right)
$area_of = array( '_bricks_page_content_2' => 'content', '_bricks_page_header_2' => 'header', '_bricks_page_footer_2' => 'footer' );
foreach ( $docs as $d ) {
	$els = get_post_meta( $d->post_id, $d->meta_key, true );
	if ( ! is_array( $els ) ) {
		continue;
	}
	$new = $walk( $els );
	if ( $new === $els ) {
		continue;
	}
	echo "changed post {$d->post_id} ({$area_of[ $d->meta_key ]})\n";
	if ( ! $dry ) {
		$r = \Bricks\Abilities\Save_Pipeline::execute( (int) $d->post_id, $new, $area_of[ $d->meta_key ] );
		if ( is_wp_error( $r ) ) {
			exit( "abort: post {$d->post_id}: " . $r->get_error_code() . ' ' . $r->get_error_message() . "\n" );
		}
	}
}
if ( ! $dry ) {
	\Bricks\Ajax::generate_style_manager_css_file();
}
ksort( $hits );
printf( "%d of %d names found, %d references%s\n", count( $hits ), count( $map ), array_sum( $hits ), $dry ? ' (dry run)' : '' );
$unused = array_diff( array_keys( $map ), array_keys( $hits ) );
if ( $unused ) {
	echo 'not found in Bricks data: ' . implode( ' ', $unused ) . "\n";
}
