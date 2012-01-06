<?php 
include('tests.inc.php');

$tests = array(

	// :letter selector
	'p:first-letter' => array(
		'test_expression' => 'jKerny is awesome',
		'css_styles' => array(
			'color' => 'red',
			'-jkerny-letter-spacing' => '2px -2px -1px -1px 2px',
		),
	),
	'p:letter:first-child' => array(
		'test_expression' => 'jKerny is awesome',
		'css_styles' => array(
			'color' => 'red',
		),
	),
	'p:word :first-letter' => array(
		'test_expression' => 'jKerny is awesome',
		'css_styles' => array(
			'color' => 'red',
		),
	),
	'p:word:first-letter' => array(
		'test_expression' => 'jKerny is awesome',
		'css_styles' => array(
			'color' => 'red',
		),
	),
	'p:last-letter' => array(
		'test_expression' => 'jKerny is awesome',
		'css_styles' => array(
			'color' => 'red',
		),
	),
	'p:letter:last-child' => array(
		'test_expression' => 'jKerny is awesome',
		'css_styles' => array(
			'color' => 'red',
		),
	),
	'p:word :last-letter' => array(
		'test_expression' => 'jKerny is awesome',
		'css_styles' => array(
			'color' => 'red',
		),
	),
	'p:word:last-letter' => array(
		'test_expression' => 'jKerny is awesome',
		'css_styles' => array(
			'color' => 'red',
		),
	),
	'p:letter:last-child' => array(
		'test_expression' => 'jKerny is awesome',
		'css_styles' => array(
			'color' => 'red',
		),
	),
	'p:letter' => array(
		'test_expression' => 'jKerny is awesome',
		'css_styles' => array(
			'background-color' => '#90A5B6',
			'color' => '#fff',
			'margin-right' => '3px',
		),
	),
	
	// :word selector
	'p:first-word' => array(
		'test_expression' => 'jKerny is awesome',
		'css_styles' => array(
			'color' => 'red',
			'-jkerny-word-spacing' => '2px -2px -1px -1px 2px',
		),
	),
	'p:word:first-child' => array(
		'test_expression' => 'jKerny is awesome',
		'css_styles' => array(
			'color' => 'red',
		),
	),
	'p:last-word' => array(
		'test_expression' => 'jKerny is awesome',
		'css_styles' => array(
			'color' => 'red',
		),
	),
	'p:word:last-child' => array(
		'test_expression' => 'jKerny is awesome',
		'css_styles' => array(
			'color' => 'red',
		),
	),
	'p:word:last-child' => array(
		'test_expression' => 'jKerny is awesome',
		'css_styles' => array(
			'color' => 'red',
		),
	),
	'p:word' => array(
		'test_expression' => 'jKerny is awesome',
		'css_styles' => array(
			'background-color' => '#90A5B6',
			'color' => '#fff',
			'margin-right' => '3px',
		),
	),
);
?>
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
	<title>jKerny.js, test cases</title>
	<meta name="description" content="jKerny.js, kerning get easy">
	<meta name="author" content="Olivier Gorzalka">
	<meta name="viewport" content="user-scalable=yes">
	<link rel="stylesheet" href="tests.css">
</head>
<body>
<header>
	<h1>jKerny test cases</h1>
</header>
<section>
<?php run_tests($tests); ?>
</section>
<footer>
	jKerny is a funny creation by <a href="http://clearideaz.com" title="Clearideaz, webdesigner et développeur frontend sur Lille, France">Olivier Gorzalka</a>
</footer>
 <!-- Grab CDN jQuery, with a protocol relative URL; fall back to local if offline -->
<script src="//ajax.aspnetcdn.com/ajax/jQuery/jquery-1.7.min.js"></script>
<script>window.jQuery || document.write('<script src="../lib/jquery-1.7.min.js"><\/script>')</script>
<script src="../lib/jkerny.beta.js"></script>
</body>
</html>
