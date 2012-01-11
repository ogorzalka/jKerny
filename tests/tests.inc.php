<?php

function convert_array_css($styles = array(), $mode='all') {
	$output = '';
	if ($mode == 'all') {
		foreach($styles as $selector=>$attributes) {
			$output .= "\n\t$selector {";
			foreach($attributes as $property=>$value) {
				$output .= "\n\t\t$property: ".str_replace('!hidden', '', $value).";\n";
			}
			$output .= "\t}\n";
		}
	} else {
		$output =  " {\n";
		foreach($styles as $property=>$value) {
		    if ($mode != 'all' && !strpos($value, '!hidden')) {
			    $output .= "\t$property: $value;\n";
			}
		}
		$output .= "}\n";
	}
	return $output;
}

function run_tests($test_cases=array()) {
?>
<h2>Invalid pseudo-selectors</h2>
<ul><?php
	$i = 1;
	$styles = array();
	echo "\n";
	?>
	<?php foreach($test_cases as $selector=>$datas): ?>
<li class="test<?php echo $i; ?>">
		<?php 
		$styles['.test'.$i.' '.$selector] = $datas['css_styles']; 
		?>
		<pre><?php echo $selector.convert_array_css($datas['css_styles'], 'single'); ?></pre>
		<p><?php echo $datas['test_expression']; ?></p>
	</li>
	<?php $i++; ?>
	<?php endforeach; ?><?php echo "\n"; ?>
</ul>
<h2>Valid selectors</h2>
<ul><?php
	echo "\n";
	?>
	<?php foreach($test_cases as $selector=>$datas): ?>
	<?php $valid_selector = preg_replace('/:((first|last)-)?(letter|word)/','._$1$3', $selector); ?>
<li class="test<?php echo $i; ?>">
		<?php 
		$styles['.test'.$i.' '.$valid_selector] = $datas['css_styles']; 
		?>
		<pre><?php echo $valid_selector.convert_array_css($datas['css_styles'], 'single'); ?></pre>
		<p><?php echo $datas['test_expression']; ?></p>
	</li>
	<?php $i++; ?>
	<?php endforeach; ?><?php echo "\n"; ?>
</ul>
<style><?php echo convert_array_css($styles); ?>
</style>
<?php
}