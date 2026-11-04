<?php
/**
 * Restores an area from a bricks_apply.php backup (`<stamp>-post<id>-<area>-<id>.json`) through
 * Bricks' Save_Pipeline — a raw update_post_meta() write is not reliable (Bricks caches and
 * revision handling); this path is the one the builder uses. Optional extra files restore the
 * global classes / components backups of the same stamp.
 *
 *   studio wp eval-file <skill>/scripts/bricks_restore.php <area-backup.json> <postId> [area] [classes.json] [components.json]
 */
if ( ! defined( 'ABSPATH' ) ) {
	exit( "run through wp eval-file\n" );
}
$file   = $args[0] ?? '';
$postId = (int) ( $args[1] ?? 0 );
$els    = is_readable( $file ) ? json_decode( (string) file_get_contents( $file ), true ) : null;
if ( ! is_array( $els ) || $postId <= 0 ) {
	exit( "usage: wp eval-file bricks_restore.php <area-backup.json> <postId> [area] [classes.json] [components.json]\n" );
}
wp_set_current_user( (int) ( get_users( array( 'role' => 'administrator', 'number' => 1, 'fields' => 'ID' ) )[0] ?? 1 ) );
$area = $args[2] ?? '';
if ( '' === $area || str_ends_with( $area, '.json' ) ) {
	$type = 'bricks_template' === get_post_type( $postId ) ? \Bricks\Templates::get_template_type( $postId ) : '';
	$area = in_array( $type, array( 'header', 'footer' ), true ) ? $type : 'content';
}
foreach ( array_slice( $args, 2 ) as $extra ) {
	if ( ! str_ends_with( $extra, '.json' ) || ! is_readable( $extra ) ) {
		continue;
	}
	$data = json_decode( (string) file_get_contents( $extra ), true );
	if ( str_contains( $extra, 'global-classes' ) ) {
		update_option( BRICKS_DB_GLOBAL_CLASSES, $data );
		update_option( BRICKS_DB_GLOBAL_CLASSES_TIMESTAMP, time() );
		echo 'restored global classes: ' . count( $data ) . "\n";
	} elseif ( str_contains( $extra, 'components' ) ) {
		update_option( BRICKS_DB_COMPONENTS, $data );
		echo 'restored components: ' . count( $data ) . "\n";
	}
}
// Element settings must be arrays (objects crash component resolution).
$els    = json_decode( wp_json_encode( $els ), true );
$result = \Bricks\Abilities\Save_Pipeline::execute( $postId, $els, $area );
if ( is_wp_error( $result ) ) {
	exit( 'abort: ' . $result->get_error_code() . ' ' . $result->get_error_message() . "\n" );
}
clean_post_cache( $postId );
$now = get_post_meta( $postId, \Bricks\Database::get_bricks_data_key( $area ), true );
printf( "restored %s of post %d: %d elements (read back %d)\n", $area, $postId, count( $els ), is_array( $now ) ? count( $now ) : 0 );
