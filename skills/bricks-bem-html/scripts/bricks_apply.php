<?php
/**
 * Applies a spec.json (spec_builder.py) to one Bricks post/template:
 *   1. backup of the area's elements + global classes + components,
 *   2. shared-class CSS replacements (`strip`), BEM classes upserted by name (CSS in `_cssCustom`;
 *      style-tab controls already set on an existing class are kept),
 *   3. components created / updated by label through Bricks abilities,
 *   4. element tree saved through Bricks' Save_Pipeline (revision kept),
 *   5. `obsolete` classes removed — only when no other post or component uses them.
 *
 *   studio wp eval-file <skill>/scripts/bricks_apply.php <spec.json> <postId> [backupDir]
 *   (non-Studio sites: wp eval-file …)
 *
 * Area (header / footer / content) follows the template type of the post.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit( "run through wp eval-file\n" );
}

$specFile = $args[0] ?? '';
$postId   = (int) ( $args[1] ?? 0 );
if ( ! is_readable( $specFile ) || $postId <= 0 ) {
	exit( "usage: wp eval-file bricks_apply.php <spec.json> <postId> [backupDir]\n" );
}
$spec = json_decode( (string) file_get_contents( $specFile ), true );
if ( ! is_array( $spec ) || empty( $spec['elements'] ) ) {
	exit( "spec invalid: $specFile\n" );
}
$backupDir = rtrim( $args[2] ?? dirname( realpath( $specFile ) ) . '/bricks-backup', '/\\' );

wp_set_current_user( (int) ( get_users( array( 'role' => 'administrator', 'number' => 1, 'fields' => 'ID' ) )[0] ?? 1 ) );

$type = 'bricks_template' === get_post_type( $postId ) ? \Bricks\Templates::get_template_type( $postId ) : '';
$area = in_array( $type, array( 'header', 'footer' ), true ) ? $type : 'content';
$metaKey = \Bricks\Database::get_bricks_data_key( $area );

// ---------------------------------------------------------------- 1. backup
wp_mkdir_p( $backupDir );
$stamp = gmdate( 'Ymd-His' ) . "-post{$postId}";
foreach ( array(
	"$area-$postId" => get_post_meta( $postId, $metaKey, true ),
	'global-classes' => get_option( BRICKS_DB_GLOBAL_CLASSES, array() ),
	'components'     => get_option( BRICKS_DB_COMPONENTS, array() ),
) as $name => $data ) {
	file_put_contents( "$backupDir/$stamp-$name.json", wp_json_encode( $data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) );
}
echo "backup: $backupDir/$stamp-*.json\n";

// ---------------------------------------------------------------- 2. classes
$catId = array_column( (array) get_option( BRICKS_DB_GLOBAL_CLASSES_CATEGORIES, array() ), 'id', 'name' );
$classes = array_values( (array) get_option( BRICKS_DB_GLOBAL_CLASSES, array() ) );
$index   = array_flip( array_column( $classes, 'name' ) );

foreach ( (array) ( $spec['strip'] ?? array() ) as $name => $pairs ) {
	if ( ! isset( $index[ $name ] ) ) {
		exit( "abort: shared class .$name not found\n" );
	}
	if ( isset( $spec['classes'][ $name ] ) ) {
		// The upsert below would write the spec's CSS back and silently undo the strip.
		exit( "abort: .$name is both stripped and defined by this spec — remove the rule from its css() source instead\n" );
	}
	$css = $classes[ $index[ $name ] ]['settings']['_cssCustom'] ?? '';
	foreach ( $pairs as [ $from, $to ] ) {
		if ( str_contains( $css, $from ) ) {
			$css = str_replace( $from, $to, $css );
		} elseif ( '' !== $to && ! str_contains( $css, $to ) ) {
			exit( "abort: expected CSS not found in .$name: $from\n" );
		}
	}
	$classes[ $index[ $name ] ]['settings']['_cssCustom'] = $css;
}

$now   = time();
$adopt = array_flip( (array) ( $spec['adopt'] ?? array() ) );
foreach ( $spec['classes'] as $name => $def ) {
	// A class that already exists in ANOTHER category with other CSS belongs to someone else (a plugin's
	// widget class, another area): overwriting it breaks their markup. Rename, or list it in `adopt`.
	if ( isset( $index[ $name ] ) && ! isset( $adopt[ $name ] ) ) {
		$cur    = $classes[ $index[ $name ] ];
		$curCat = (string) array_search( $cur['category'] ?? '', $catId, true );
		$curCss = (string) ( $cur['settings']['_cssCustom'] ?? '' );
		if ( '' !== $curCss && $curCss !== $def['css'] && '' !== $curCat && $curCat !== $def['category'] ) {
			exit( "abort: .$name already exists in category \"$curCat\" with other CSS — pick another name, or adopt it on purpose (write(..., adopt=[\"$name\"]))\n" );
		}
	}
	if ( ! isset( $catId[ $def['category'] ] ) ) {
		$cats            = (array) get_option( BRICKS_DB_GLOBAL_CLASSES_CATEGORIES, array() );
		$newCat          = array( 'id' => substr( md5( $def['category'] ), 0, 6 ), 'name' => $def['category'] );
		$cats[]          = $newCat;
		update_option( BRICKS_DB_GLOBAL_CLASSES_CATEGORIES, $cats );
		$catId[ $def['category'] ] = $newCat['id'];
		echo "created class category {$def['category']}\n";
	}
	$settings = '' !== $def['css'] ? array( '_cssCustom' => $def['css'] ) : array();
	if ( isset( $index[ $name ] ) ) {
		// Style-panel values of the class (Style tab controls: _display, _padding, _typography, …) are
		// the editor's, not the spec's: keep them, replace only the custom CSS.
		$controls = array_diff_key( (array) ( $classes[ $index[ $name ] ]['settings'] ?? array() ), array( '_cssCustom' => true ) );
		$classes[ $index[ $name ] ] = array_merge( $classes[ $index[ $name ] ], array( 'settings' => $controls + $settings, 'category' => $catId[ $def['category'] ], 'modified' => $now ) );
		continue;
	}
	$ids = array_column( $classes, 'id' );
	do {
		$id = substr( str_shuffle( 'abcdefghijklmnopqrstuvwxyz0123456789' ), 0, 6 );
	} while ( in_array( $id, $ids, true ) );
	$classes[]      = array( 'id' => $id, 'name' => $name, 'settings' => $settings, 'category' => $catId[ $def['category'] ], 'modified' => $now, 'user_id' => get_current_user_id() );
	$index[ $name ] = count( $classes ) - 1;
}
update_option( BRICKS_DB_GLOBAL_CLASSES, $classes );
update_option( BRICKS_DB_GLOBAL_CLASSES_TIMESTAMP, $now );
update_option( BRICKS_DB_GLOBAL_CLASSES_USER, get_current_user_id() );
\Bricks\Database::$global_data['globalClasses'] = $classes;
$byName = array_column( $classes, 'id', 'name' );
echo count( $spec['classes'] ) . " classes upserted\n";

$classIds = static function ( array $names ) use ( $byName ): array {
	return array_map(
		static function ( $n ) use ( $byName ) {
			if ( ! isset( $byName[ $n ] ) ) {
				exit( "abort: class $n does not exist on the site\n" );
			}
			return $byName[ $n ];
		},
		$names
	);
};
$ability = static function ( string $name, array $input ) {
	$a = function_exists( 'wp_get_ability' ) ? wp_get_ability( $name ) : null;
	if ( ! $a ) {
		exit( "abort: ability $name not available (WordPress Abilities API + Bricks 2.4 abilities required)\n" );
	}
	$r = $a->execute( $input );
	if ( is_wp_error( $r ) ) {
		exit( "abort: $name: " . $r->get_error_code() . ' ' . $r->get_error_message() . ' ' . wp_json_encode( $r->get_error_data() ) . "\n" );
	}
	return $r;
};

// ---------------------------------------------------------------- icons: Bricks custom icon set (Bricks → Icons)
$iconRows = array();
$iconSet  = '';
if ( ! empty( $spec['icons'] ) ) {
	foreach ( (array) ( $ability( 'bricks/list-icon-sets', array() )['customIconSets'] ?? array() ) as $set ) {
		if ( $set['name'] === $spec['icons']['set'] ) {
			$iconSet = $set['id'];
		}
	}
	if ( ! $iconSet ) {
		$iconSet = $ability( 'bricks/create-custom-icon-set', array( 'name' => $spec['icons']['set'] ) )['id'];
		echo "created icon set {$spec['icons']['set']} ($iconSet)\n";
	}
	$page = 1;
	do {
		$list = $ability( 'bricks/list-custom-icons', array( 'setId' => $iconSet, 'page' => $page, 'perPage' => 100 ) );
		foreach ( $list['items'] as $item ) {
			$iconRows[ $item['name'] ] = $item;
		}
		++$page;
	} while ( count( $list['items'] ) && $page <= (int) ceil( ( $list['total'] ?? 0 ) / 100 ) );
	$uploaded = 0;
	foreach ( glob( rtrim( $spec['icons']['dir'], '/\\' ) . '/*.svg' ) ?: array() as $file ) {
		$name = basename( $file, '.svg' );
		if ( ! isset( $iconRows[ $name ] ) ) {
			$iconRows[ $name ] = $ability( 'bricks/upload-custom-icon', array( 'setId' => $iconSet, 'name' => $name, 'svg' => (string) file_get_contents( $file ) ) )['icon'];
			++$uploaded;
		}
	}
	echo "icon set {$spec['icons']['set']}: " . count( $iconRows ) . " icons ($uploaded uploaded)\n";
}
/** Icon control value of a set icon, as the builder stores it. */
$iconValue = static function ( string $name ) use ( &$iconRows, &$iconSet ): array {
	if ( ! isset( $iconRows[ $name ] ) ) {
		exit( "abort: icon $name is not in the icon set\n" );
	}
	$r = $iconRows[ $name ];
	return array( 'library' => 'custom_' . $iconSet, 'svg' => array( 'id' => (int) $r['attachment_id'], 'icon_id' => $r['id'], 'url' => $r['url'] ) );
};
/** Replaces every {"__icon__": name} placeholder in settings. */
$resolveIcons = static function ( $value ) use ( &$resolveIcons, $iconValue ) {
	if ( ! is_array( $value ) ) {
		return $value;
	}
	if ( isset( $value['__icon__'] ) && 1 === count( $value ) ) {
		return $iconValue( $value['__icon__'] );
	}
	return array_map( $resolveIcons, $value );
};
$row = static function ( array $e ) use ( $classIds, $resolveIcons ): array {
	$settings = $resolveIcons( $e['settings'] ?: array() );
	if ( $e['classes'] ) {
		$settings['_cssGlobalClasses'] = $classIds( $e['classes'] );
	}
	return array( 'id' => $e['id'], 'name' => $e['name'], 'parent' => $e['parent'], 'children' => $e['children'], 'label' => $e['label'], 'settings' => $settings );
};

// ---------------------------------------------------------------- 3. components
$cidByLabel   = array();
$propsByLabel = array();
if ( ! empty( $spec['components'] ) ) {
	$existing = array();
	$page     = 1;
	do {
		$list = $ability( 'bricks/list-components', array( 'page' => $page, 'perPage' => 100 ) );
		foreach ( $list['items'] as $item ) {
			$existing[ $item['label'] ] = $item['id'];
		}
		++$page;
	} while ( ! empty( $list['hasMore'] ) );

	foreach ( $spec['components'] as $c ) {
		$elements              = array_map( $row, $c['elements'] );
		$elements[0]['parent'] = '0';
		// Icon property defaults are written as icon names in the spec.
		$properties = array_map(
			static fn( $p ) => ( 'icon' === ( $p['type'] ?? '' ) && is_string( $p['default'] ?? null ) && '' !== $p['default'] ) ? array( 'default' => $iconValue( $p['default'] ) ) + $p : $p,
			$c['properties']
		);
		$input                 = array( 'label' => $c['label'], 'category' => $c['category'], 'desc' => $c['desc'], 'elements' => $elements, 'properties' => $properties );
		if ( isset( $existing[ $c['label'] ] ) ) {
			$current = $ability( 'bricks/get-component', array( 'componentId' => $existing[ $c['label'] ] ) );
			$result  = $ability( 'bricks/update-component', $input + array( 'componentId' => $existing[ $c['label'] ], 'expectedDesignSystemVersion' => $current['designSystemVersion'], 'expectedComponentDigest' => $current['componentDigest'] ) );
		} else {
			$result = $ability( 'bricks/create-component', $input );
		}
		$cidByLabel[ $c['label'] ]   = $result['component']['id'];
		$propsByLabel[ $c['label'] ] = array_column( $c['properties'], 'type', 'id' );
		echo ( isset( $existing[ $c['label'] ] ) ? 'updated' : 'created' ) . " component {$c['label']} ({$result['component']['id']})\n";
	}
}

// ---------------------------------------------------------------- 4. elements
$elements = array();
foreach ( $spec['elements'] as $e ) {
	if ( empty( $e['component'] ) ) {
		$elements[] = $row( $e );
		continue;
	}
	$properties = array();
	foreach ( $e['values'] as $prop => $value ) {
		$ptype = $propsByLabel[ $e['component'] ][ $prop ] ?? null;
		if ( null === $ptype ) {
			exit( "abort: component {$e['component']} has no property $prop\n" );
		}
		$properties[ $prop ] = 'class' === $ptype ? $classIds( (array) $value ) : ( 'icon' === $ptype ? $iconValue( (string) $value ) : $value );
	}
	$elements[] = array( 'id' => $e['id'], 'name' => $e['name'], 'parent' => $e['parent'], 'children' => array(), 'label' => $e['label'], 'cid' => $cidByLabel[ $e['component'] ], 'properties' => $properties, 'settings' => array() );
}
$result = \Bricks\Abilities\Save_Pipeline::execute( $postId, $elements, $area );
if ( is_wp_error( $result ) ) {
	exit( 'abort: save failed: ' . $result->get_error_code() . ' ' . $result->get_error_message() . "\n" );
}
echo count( (array) get_post_meta( $postId, $metaKey, true ) ) . " $area elements saved on post $postId\n";

// ---------------------------------------------------------------- 5. obsolete classes (guarded)
$obsolete = array_intersect_key( $byName, array_flip( (array) ( $spec['obsolete'] ?? array() ) ) );
if ( $obsolete ) {
	$ids = array_flip( $obsolete );
	$hit = static function ( array $els ) use ( $ids ): ?string {
		foreach ( $els as $el ) {
			foreach ( (array) ( $el['settings']['_cssGlobalClasses'] ?? array() ) as $id ) {
				if ( isset( $ids[ $id ] ) ) {
					return $ids[ $id ];
				}
			}
			foreach ( (array) ( $el['properties'] ?? array() ) as $v ) {
				foreach ( is_array( $v ) ? $v : array( $v ) as $id ) {
					if ( is_string( $id ) && isset( $ids[ $id ] ) ) {
						return $ids[ $id ];
					}
				}
			}
		}
		return null;
	};
	global $wpdb;
	$rows = $wpdb->get_results( "SELECT m.post_id, m.meta_value FROM $wpdb->postmeta m JOIN $wpdb->posts p ON p.ID = m.post_id WHERE m.meta_key IN ('_bricks_page_content_2','_bricks_page_header_2','_bricks_page_footer_2') AND p.post_type <> 'revision'" );
	foreach ( $rows as $r ) {
		$name = $hit( (array) maybe_unserialize( $r->meta_value ) );
		if ( $name ) {
			unset( $obsolete[ $name ] );
			echo "kept .$name: still used by post {$r->post_id}\n";
		}
	}
	foreach ( (array) get_option( BRICKS_DB_COMPONENTS, array() ) as $comp ) {
		$name = $hit( (array) ( $comp['elements'] ?? array() ) );
		if ( $name && isset( $obsolete[ $name ] ) ) {
			unset( $obsolete[ $name ] );
			echo "kept .$name: still used by component {$comp['id']}\n";
		}
	}
	// Markup rendered outside Bricks (plugin widgets, shortcodes): keep a class its sources mention.
	foreach ( (array) ( $spec['scan'] ?? array() ) as $dir ) {
		if ( ! is_dir( $dir ) || ! $obsolete ) {
			continue;
		}
		$it = new RecursiveIteratorIterator( new RecursiveDirectoryIterator( $dir, FilesystemIterator::SKIP_DOTS ) );
		foreach ( $it as $file ) {
			// third-party code (Composer, npm, minified bundles) mentions arbitrary words like `scroller`
			if ( ! preg_match( '/\.(php|js|html)$/', $file->getFilename() ) || preg_match( '#[/\\\\](vendor|node_modules)[/\\\\]#', $file->getPathname() ) || preg_match( '/\.min\.js$/', $file->getFilename() ) ) {
				continue;
			}
			$src = (string) file_get_contents( $file->getPathname() );
			foreach ( array_keys( $obsolete ) as $name ) {
				if ( preg_match( '/(?<![\w-])' . preg_quote( $name, '/' ) . '(?![\w-])/', $src ) ) {
					unset( $obsolete[ $name ] );
					echo "kept .$name: mentioned in " . $file->getFilename() . "\n";
				}
			}
		}
	}
	if ( $obsolete ) {
		$classes = array_values( array_filter( $classes, static fn( $c ) => ! isset( $obsolete[ $c['name'] ] ) ) );
		update_option( BRICKS_DB_GLOBAL_CLASSES, $classes );
		echo 'removed ' . count( $obsolete ) . ' obsolete class(es): ' . implode( ', ', array_keys( $obsolete ) ) . "\n";
	}
}
