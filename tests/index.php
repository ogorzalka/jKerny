<?php 
include('tests.inc.php');

$tests = array(

	// :letter selector
	'p:first-letter' => array(
		'test_expression' => 'jKerny is awesome',
		'css_styles' => array(
			'color' => 'red',
			'-jkerny-letter-spacing' => '2px -2px 0px 2px -2px',
		),
	),
	'p:letter:first-child' => array(
		'test_expression' => 'jKerny is awesome',
		'css_styles' => array(
			'color' => 'red',
		),
	),
	'p:word:last-child :first-letter' => array(
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
		'test_expression' => 'HTML5',
		'css_styles' => array(
			'color' => 'red',
		),
	),
	'p:letter:last-child' => array(
		'test_expression' => 'HTML5 IS AWESOME',
		'css_styles' => array(
			'color' => 'red',
		),
	),
	'p:last-word :last-letter' => array(
		'test_expression' => 'YEAH IT\'S CSS3',
		'css_styles' => array(
			'color' => 'red',
			'font-size' => '1.2em',
		),
	),
	'p:first-word:last-letter' => array(
		'test_expression' => 'HTML5 is awesome',
		'css_styles' => array(
		    'font-size' => '1.2em',
            'text-shadow' => '0 0 2px red',
            'color' => 'red !hidden',
            'color' => 'transparent',
		),
	),
	'p:letter:last-child' => array(
		'test_expression' => 'jKerny is awesome',
		'css_styles' => array(
			'color' => 'red',
		),
	),
	'p:letter' => array(
		'test_expression' => 'ROCK THE WORLD',
		'css_styles' => array(
			'background-color' => 'black',
			'color' => 'red',
			'margin-right' => '3px',
			'padding' => '0 5px'
		),
	),
    'p:letter:nth-child(2n)' => array(
    	'test_expression' => 'COOOOL',
    	'css_styles' => array(
    		'font-size' => '0.8em',
    	),
    ),
	'p:letter:before' => array(
		'test_expression' => 'AAAAAA',
		'css_styles' => array(
			'content' => '"H"',
			'color' => 'red',
		),
	),
	'p:letter:after' => array(
		'test_expression' => 'HHHHHH',
		'css_styles' => array(
			'content' => '"A"',
			'color' => 'red',
		),
	),
	'p:first-letter:before' => array(
		'test_expression' => 'Kerny',
		'css_styles' => array(
			'content' => '"j"',
			'color' => 'red',
		),
	),
	'p:last-letter:before' => array(
		'test_expression' => 'jKery',
		'css_styles' => array(
			'content' => '"n"',
			'color' => 'red',
		),
	),

	// :word selector
	'p:first-word' => array(
		'test_expression' => 'jKerny is awesome',
		'css_styles' => array(
			'color' => 'red',
			'-jkerny-word-spacing' => '5px 6px',
		),
	),
	'p:word:first-child' => array(
		'test_expression' => 'jKerny is awesome',
		'css_styles' => array(
			'color' => 'red',
		),
	),
	'p:last-word' => array(
		'test_expression' => 'It\'s CRAZY!!!',
		'css_styles' => array(
		    'font-size' => '1.5em',
		    'margin-left' => '5px',
			'letter-spacing' => '5px',
			'-moz-transform'=> 'rotate(-5deg) !hidden',
			'-o-transform'=> 'rotate(-5deg) !hidden',
			'-webkit-transform'=> 'rotate(-5deg) !hidden',
			'transform'=> 'rotate(-5deg)',
		),
	),
	'p:word:last-child' => array(
		'test_expression' => 'Use Wordpress',
		'css_styles' => array(
			'font-style' => 'italic',
			'color' => 'rgba(0,0,0,0.5)'
		),
	),
	'p:word' => array(
		'test_expression' => 'jKerny is awesome',
		'css_styles' => array(
            'background-color' => 'black',
            'color' => 'red',
            'margin-right' => '3px',
            'padding' => '0 5px'
		),
	),
    'p:word:nth-child(odd)' => array(
    	'test_expression' => 'ROCK N\' ROLL',
    	'css_styles' => array(
    		'font-size' => '1.2em',
    	),
    ),
	'p:first-word:before' => array(
		'test_expression' => 'is awesome',
		'css_styles' => array(
			'content' => '"jKerny "',
			'color' => 'red',
		),
	),
	'p:word:after' => array(
		'test_expression' => 'AH AH',
		'css_styles' => array(
			'content' => '" AH"',
			'color' => 'red',
		),
	),
	'p:word:before' => array(
		'test_expression' => '4 !',
		'css_styles' => array(
			'content' => '"EYE "',
			'color' => 'red',
			'font-size' => '1.2em',
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
	<link rel="stylesheet" href="tests.css?v=<?php echo time(); ?>">
	<link href='http://fonts.googleapis.com/css?family=Patua+One' rel='stylesheet' type='text/css'>
</head>
<body>
<header>
	<h1>jKerny test cases</h1>
	<a href="../">&lt; Back to the jKerny homepage</a>
</header>
<section>
<?php run_tests($tests); ?>
</section>
<footer>
	jKerny is a funny creation by <a href="http://clearideaz.com" title="Clearideaz, webdesigner et développeur frontend sur Lille, France">Olivier Gorzalka</a>
</footer>
 <!-- Grab CDN jQuery, with a protocol relative URL; fall back to local if offline -->
<script src="//ajax.aspnetcdn.com/ajax/jQuery/jquery-1.7.min.js"></script>
<script>window.jQuery || document.write('<script src="../vendor/jquery-1.7.min.js"><\/script>')</script>
<script src="../lib/jkerny.js"></script>
</body>
</html>
