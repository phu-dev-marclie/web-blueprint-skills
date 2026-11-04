<?php
/**
 * Applies a tokens.json (see references/tokens.md) to Bricks' Style Manager:
 *   - Color Manager palettes  (colors: {name, light, dark?, shade?: {type, parent, index}}
 *                              →  {id, raw: var(--name), light, dark, [type, parent: <parent id>, index]})
 *   - variable categories     (ordered; optional `scale` config → Style Manager Typography / Spacing tab)
 *   - global variables        (ordered; `scale: {scale, scaleName}` for scale members)
 *   - Style Manager settings  (htmlFontSize, min/maxScreenWidth, defaultMode)
 * `breakpoints` and `themeStyleCss` in the spec are reported, not written (Bricks › Settings › Breakpoints;
 * site-wide theme style › Custom CSS).
 *
 * The spec is the complete token set: palettes, categories and variables not in it are removed.
 * Guards (abort before writing):
 *   - a name may exist once across palettes + variables (Bricks blocks duplicates in the UI),
 *   - every token name defined before must still be defined, unless listed in `drop`,
 *   - a dropped name must not be referenced by classes, theme styles, components or Bricks documents.
 * IDs are kept by name (palette by id/name, color + variable by name) so stored references survive.
 *
 *   studio wp eval-file <skill>/scripts/bricks_tokens_apply.php <tokens.json> [backupDir] [dry]
 *   (`dry` is a plain word: WP-CLI rejects unknown --flags)
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit( "run through wp eval-file\n" );
}

$specFile = $args[0] ?? '';
$dry      = in_array( 'dry', $args, true );
$spec     = is_readable( $specFile ) ? json_decode( (string) file_get_contents( $specFile ), true ) : null;
if ( ! is_array( $spec ) || empty( $spec['palettes'] ) || ! isset( $spec['variables'] ) ) {
	exit( "usage: wp eval-file bricks_tokens_apply.php <tokens.json> [backupDir] [dry]\n" );
}
$backupDir = rtrim( ( isset( $args[1] ) && 'dry' !== $args[1] ) ? $args[1] : dirname( realpath( $specFile ) ) . '/bricks-backup', '/\\' );

$oldPalettes = (array) get_option( BRICKS_DB_COLOR_PALETTE, array() );
$oldVars     = (array) get_option( BRICKS_DB_GLOBAL_VARIABLES, array() );
$oldCats     = (array) get_option( BRICKS_DB_GLOBAL_VARIABLES_CATEGORIES, array() );
$oldSm       = get_option( BRICKS_DB_STYLE_MANAGER, array() );

$varName = static fn( $raw ) => preg_match( '/^var\(\s*--([\w-]+)\s*\)$/', (string) $raw, $m ) ? $m[1] : null;
$newId   = static fn() => \Bricks\Helpers::generate_random_id( false );

// ---------------------------------------------------------------- current names + ids
$before   = array();
$colorIds = array();
foreach ( $oldPalettes as $p ) {
	foreach ( (array) ( $p['colors'] ?? array() ) as $c ) {
		$n = $varName( $c['raw'] ?? '' );
		if ( $n ) {
			$before[ $n ]   = 'palette ' . ( $p['name'] ?? '' );
			$colorIds[ $n ] = $c['id'];
		}
	}
}
$varIds = array();
foreach ( $oldVars as $v ) {
	$before[ $v['name'] ] = 'variable';
	$varIds[ $v['name'] ] = $v['id'];
}

// ---------------------------------------------------------------- build
$errors   = array();
$defined  = array();
$palettes = array();
foreach ( $spec['palettes'] as $p ) {
	$match = null;
	foreach ( $oldPalettes as $op ) {
		if ( ( isset( $p['id'] ) && $op['id'] === $p['id'] ) || ( $op['name'] ?? '' ) === $p['name'] ) {
			$match = $op;
			break;
		}
	}
	$colors = array();
	$ids    = array();   // name → id inside this palette (shade parents)
	foreach ( $p['colors'] as $c ) {
		if ( isset( $defined[ $c['name'] ] ) ) {
			$errors[] = "duplicate name --{$c['name']} ({$defined[ $c['name'] ]}, palette {$p['name']})";
		}
		$defined[ $c['name'] ] = "palette {$p['name']}";
		$row = array(
			'id'    => $colorIds[ $c['name'] ] ?? $newId(),
			'raw'   => "var(--{$c['name']})",
			'light' => $c['light'],
		);
		$ids[ $c['name'] ] = $row['id'];
		if ( ! empty( $c['dark'] ) ) {
			// `dark` drives the CSS; `darkModeEnabled` is what the Color Manager toggle reads.
			$row['dark']            = $c['dark'];
			$row['darkModeEnabled'] = true;
		}
		if ( ! empty( $c['shade'] ) ) {
			// a Bricks shade (Color shades popup): grouped under its base colour in the Color Manager
			$parent = $c['shade']['parent'] ?? '';
			if ( ! isset( $ids[ $parent ] ) ) {
				$errors[] = "--{$c['name']}: shade parent --$parent must come earlier in palette {$p['name']}";
			}
			$row['type']   = $c['shade']['type'];
			$row['parent'] = $ids[ $parent ] ?? '';
			$row['index']  = (int) $c['shade']['index'];
		}
		$colors[] = $row;
	}
	$palettes[] = array(
		'id'     => $p['id'] ?? ( $match['id'] ?? $newId() ),
		'name'   => $p['name'],
		'colors' => $colors,
	);
}

$cats = array();
foreach ( $spec['categories'] as $c ) {
	$row = array( 'id' => $c['id'], 'name' => $c['name'] );
	if ( ! empty( $c['scale'] ) ) {
		$row['scale'] = $c['scale'];
	}
	$cats[] = $row;
}
$catIds = array_column( $cats, 'id' );

$vars = array();
foreach ( $spec['variables'] as $v ) {
	if ( isset( $defined[ $v['name'] ] ) ) {
		$errors[] = "duplicate name --{$v['name']} ({$defined[ $v['name'] ]}, variable)";
	}
	if ( ! in_array( $v['category'], $catIds, true ) ) {
		$errors[] = "--{$v['name']}: unknown category {$v['category']}";
	}
	$defined[ $v['name'] ] = 'variable';
	$row = array(
		'id'       => $varIds[ $v['name'] ] ?? $newId(),
		'name'     => $v['name'],
		'value'    => $v['value'],
		'category' => $v['category'],
	);
	if ( isset( $v['scale'] ) ) {
		$row['scale'] = $v['scale'];
	}
	$vars[] = $row;
}

$drop    = (array) ( $spec['drop'] ?? array() );
$missing = array_diff( array_keys( $before ), array_keys( $defined ), $drop );
foreach ( $missing as $n ) {
	$errors[] = "--$n ({$before[ $n ]}) would disappear; add it to the spec or to `drop`";
}

global $wpdb;
$haystack = wp_json_encode( get_option( BRICKS_DB_GLOBAL_CLASSES, array() ) ) . wp_json_encode( get_option( BRICKS_DB_THEME_STYLES, array() ) )
	. wp_json_encode( get_option( BRICKS_DB_COMPONENTS, array() ) )
	. implode( ' ', $wpdb->get_col( "SELECT meta_value FROM $wpdb->postmeta WHERE meta_key LIKE '\\_bricks\\_page\\_%'" ) );
foreach ( $drop as $n ) {
	if ( preg_match( '/var\(\s*--' . preg_quote( $n, '/' ) . '\s*[,)]/', $haystack ) ) {
		$errors[] = "--$n is listed in `drop` but still referenced";
	}
}

$sm = array_merge( is_array( $oldSm ) ? $oldSm : array(), (array) ( $spec['styleManager'] ?? array() ) );

printf( "palettes %d → %d (colors %d) | categories %d → %d | variables %d → %d | dropped %s\n",
	count( $oldPalettes ), count( $palettes ), array_sum( array_map( static fn( $p ) => count( $p['colors'] ), $palettes ) ),
	count( $oldCats ), count( $cats ), count( $oldVars ), count( $vars ), $drop ? implode( ',', $drop ) : '-' );
if ( $errors ) {
	echo "ABORT:\n  " . implode( "\n  ", $errors ) . "\n";
	return;
}
if ( $dry ) {
	echo "dry run: nothing written\n";
	return;
}

// ---------------------------------------------------------------- backup + write
wp_mkdir_p( $backupDir );
$file = $backupDir . '/' . gmdate( 'Ymd-His' ) . '-tokens.json';
file_put_contents( $file, wp_json_encode( array(
	BRICKS_DB_COLOR_PALETTE               => $oldPalettes,
	BRICKS_DB_GLOBAL_VARIABLES            => $oldVars,
	BRICKS_DB_GLOBAL_VARIABLES_CATEGORIES => $oldCats,
	BRICKS_DB_STYLE_MANAGER               => $oldSm,
), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) );
echo "backup: $file\n";

update_option( BRICKS_DB_COLOR_PALETTE, $palettes );
update_option( BRICKS_DB_GLOBAL_VARIABLES_CATEGORIES, $cats );
update_option( BRICKS_DB_GLOBAL_VARIABLES, $vars );
update_option( BRICKS_DB_STYLE_MANAGER, $sm );

// Regenerate style-manager.min.css (palette + scale variables); external-file mode also keeps
// color-palettes.min.css and global-variables.min.css.
\Bricks\Ajax::generate_style_manager_css_file();
if ( 'file' === \Bricks\Database::get_setting( 'cssLoading' ) ) {
	\Bricks\Assets_Color_Palettes::generate_css_file( $palettes );
	\Bricks\Assets_Global_Variables::generate_css_file( $vars );
}
echo "written: palettes, variable categories, variables, style manager settings\n";
if ( ! empty( $spec['breakpoints'] ) ) {
	echo "TODO breakpoints (Bricks › Settings › Breakpoints, skill bricks-breakpoints): "
		. implode( ', ', array_map( static fn( $b ) => "{$b['label']} {$b['width']}" . ( ! empty( $b['custom'] ) ? ' (custom)' : '' ), $spec['breakpoints'] ) ) . "\n";
}
if ( ! empty( $spec['themeStyleCss'] ) ) {
	echo "TODO theme style (site-wide, conditions any) › Custom CSS:\n" . $spec['themeStyleCss'];
}
