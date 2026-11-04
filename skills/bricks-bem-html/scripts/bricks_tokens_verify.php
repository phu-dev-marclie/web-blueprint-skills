<?php
/**
 * Recomputes a tokens.json (tokens_builder.py) with Bricks' own code and lists every difference.
 *   - generated scales (category.scale.isManual false): Abilities\Design::build_scale_variable (via reflection)
 *   - brand shades (colors with `shade`): Abilities\Color::mix + to_string, the bricks/generate-color-shades path
 * Read-only; needs Bricks ≥ 2.4 (abilities).
 *
 *   studio wp eval-file <skill>/scripts/bricks_tokens_verify.php <tokens.json>
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit( "run through wp eval-file\n" );
}
$spec = is_readable( $args[0] ?? '' ) ? json_decode( (string) file_get_contents( $args[0] ), true ) : null;
if ( ! is_array( $spec ) || empty( $spec['styleManager']['htmlFontSize'] ) ) {
	exit( "usage: wp eval-file bricks_tokens_verify.php <tokens.json> (with styleManager.htmlFontSize)\n" );
}
$sm    = $spec['styleManager'];
$parse = new ReflectionMethod( '\Bricks\Abilities\Design', 'parse_html_font_size_to_px' );
$build = new ReflectionMethod( '\Bricks\Abilities\Design', 'build_scale_variable' );
$parse->setAccessible( true );
$build->setAccessible( true );
$html = $parse->invoke( null, $sm['htmlFontSize'] );

$checked = 0;
$bad     = array();
foreach ( $spec['categories'] as $cat ) {
	if ( empty( $cat['scale'] ) || ! empty( $cat['scale']['isManual'] ) ) {
		continue;
	}
	foreach ( $spec['variables'] as $v ) {
		if ( ( $v['category'] ?? '' ) !== $cat['id'] || ! isset( $v['scale'] ) ) {
			continue;
		}
		$out = $build->invoke( null, $cat, $v['scale']['scale'], $html, (float) $sm['minScreenWidth'], (float) $sm['maxScreenWidth'] );
		++$checked;
		if ( ! $out || $out['name'] !== $v['name'] || $out['value'] !== $v['value'] ) {
			$bad[] = "--{$v['name']}: spec {$v['value']} | bricks " . ( $out ? "--{$out['name']} {$out['value']}" : 'null' );
		}
	}
}

$C = '\Bricks\Abilities\Color';
foreach ( $spec['palettes'] as $p ) {
	$light = array_column( $p['colors'], 'light', 'name' );
	foreach ( $p['colors'] as $c ) {
		if ( empty( $c['shade'] ) ) {
			continue;
		}
		$s      = $c['shade'];
		$steps  = count( array_filter( $p['colors'], static fn( $x ) => ( $x['shade']['parent'] ?? '' ) === $s['parent'] && $x['shade']['type'] === $s['type'] ) );
		$base   = $C::parse( $light[ $s['parent'] ] ?? '' );
		$target = $C::parse( 'light' === $s['type'] ? '#ffffff' : '#000000' );
		$value  = $base ? $C::to_string( $C::mix( $target, $base, ( 100 / ( $steps + 1 ) ) * ( $steps - $s['index'] ) ), $base['format'] ?? 'hex' ) : 'unparseable base';
		++$checked;
		if ( strtolower( $value ) !== strtolower( $c['light'] ) ) {
			$bad[] = "--{$c['name']}: spec {$c['light']} | bricks $value";
		}
	}
}
echo "checked $checked generated values, " . count( $bad ) . " mismatch(es)\n" . ( $bad ? '  ' . implode( "\n  ", $bad ) . "\n" : '' );
