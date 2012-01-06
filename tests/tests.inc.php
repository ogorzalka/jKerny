<?php

function convert_array_css($styles = array(), $mode='all') {
	$output = '';
	if ($mode == 'all') {
		foreach($styles as $selector=>$attributes) {
			$output .= "\n\t$selector {";
			foreach($attributes as $property=>$value) {
				$output .= "\n\t\t$property: $value;\n";
			}
			$output .= "\t}\n";
		}
	} else {
		$output =  " {\n";
		foreach($styles as $property=>$value) {
			$output .= "\t$property: $value;\n";
		}
		$output .= "}\n";
	}
	return $output;
}

function run_tests($test_cases=array()) {
?>
<ul><?php
	$i = 0;
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
<style><?php echo convert_array_css($styles); ?>
</style>
<?php
}