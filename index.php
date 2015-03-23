<?php 
require_once("lib/locallib.php");
if (isset($_REQUEST['station'])){ $selectedStation = rawurldecode($_REQUEST['station']); }else{ $selectedStation = $station[0]->name; }
if (isset($_REQUEST['p'])){ $pageSelector= rawurldecode($_REQUEST['p']); }else{ $pageSelector = "last"; }
echo '<center><form action="./?p=' . $pageSelector . '" method="POST">';
echo ' Selected Station: ';
echo '<select name="station" id="station" onchange="this.form.submit()">';
if (isset($_GET['allsongs'])){
	echo '<option value="' . '" selected="selected"></option>';
	$selectedStation = 'none';
}

foreach($station AS $item){
	echo '<option value="' . $item->name . '"';
	if ($selectedStation == $item->name) echo 'selected="selected"';
	echo '>' . $item->name . '</option>';
}
echo '</select>';
echo ' <a href="./?allsongs">All Songs In Database</a>';
echo '</form></center><hr>';
if (isset($_GET['allsongs'])){
	echo '<center><h3>All Songs</h3></center>';
	$spotify = MetaTune\MetaTune::getInstance();
	$count = 1;
	if (isset($_REQUEST['page'])){ $page = $_REQUEST['page']; }else{ $page = 1;}
	echo 'Page: ';
	$pages = count(getAllSongs()) / 100;
	
	for ($i = 1; $i <= ($pages + 1 ); $i ++){
		if ($page == $i){
			print_r('<b>' . $i . '</b> ');

		}else{
			print_r('<a href="http://www.cybercorey.net/RadioNetwork/?allsongs&page=' . $i . '">' . $i . '</a> ');
		}
	}
	$page --;
	print_r("<br>");
	foreach(getAllSongs() AS $id => $item){
		if ($count > ($page * 100) && $count <= ($page * 100 + 100)){
			$storedSong = $item['artist'] . ' - ' . $item['title'];
			if ($item['uri'] != ""){
				$lookUp = $spotify->lookup($item['uri']);
				$lookedSong = $lookUp->getArtistAsString() . ' - ' . $lookUp->getTitle();
				
				if ($storedSong == $lookedSong){
					print_r('<span style="background-color:lime;">*P*</span>');
				}else{
					print_r('<span style="background-color:red;">*E*</span>');
				}
			}else{
				print_r('<span style="background-color:yellow;">*N*</span>');
			}
			print_r(' ' . $count . ') ' . drawSongLink($item));
			//print_r($count . ') Looking up: ' . $storedSong . ' ');
			
			echo "<br>";
		}
		$count++;
	}
	exit(1);
}
echo '<center>';
echo '<a href="./?station=' . rawurlencode($selectedStation) . '&p=all">All Songs</a> - ';
echo '<a href="./?station=' . rawurlencode($selectedStation) . '&p=last">Last Songs</a> - ';
echo '<a href="./?station=' . rawurlencode($selectedStation) . '&p=top">Top 100 Songs</a>';
echo '</center><hr>';

if ($pageSelector == 'all'){
	echo '<center><h3>All Songs</h3></center>';
	$spotify = MetaTune\MetaTune::getInstance();
	$count = 1;
	if (isset($_REQUEST['page'])){ $page = $_REQUEST['page']; }else{ $page = 1;}
	echo 'Page: ';
	$pages = count(getSongs($selectedStation)) / 100;
	
	for ($i = 1; $i <= ($pages + 1 ); $i ++){
		if ($page == $i){
			print_r('<b>' . $i . '</b> ');

		}else{
			print_r('<a href="http://www.cybercorey.net/RadioNetwork/?station=' . rawurlencode($selectedStation) . '&p=all&page=' . $i . '">' . $i . '</a> ');
		}
	}
	$page --;
	print_r("<br>");
	foreach(getSongs($selectedStation) AS $id => $item){
		if ($count > ($page * 100) && $count <= ($page * 100 + 100)){
			$storedSong = $item['artist'] . ' - ' . $item['title'];
			if ($item['uri'] != ""){
				$lookUp = $spotify->lookup($item['uri']);
				$lookedSong = $lookUp->getArtistAsString() . ' - ' . $lookUp->getTitle();
				
				if ($storedSong == $lookedSong){
					print_r('<span style="background-color:lime;">*P*</span>');
				}else{
					print_r('<span style="background-color:red;">*E*</span>');
				}
			}else{
				print_r('<span style="background-color:yellow;">*N*</span>');
			}
			print_r(' ' . $count . ') ' . drawSongLink($item));
			//print_r($count . ') Looking up: ' . $storedSong . ' ');
			
			echo "<br>";
		}
		$count++;
	}
}
if ($pageSelector == 'last'){
	echo '<center><h3>Last Songs</h3></center>';
	$hourCount = null;
	$date = null;
	foreach(listsongs($selectedStation) AS $id => $item){
		if ($date != date('d/m/Y', $item['timestamp'])){
			print_r('<h2>'.date('d/m/Y', $item['timestamp']).'</h2>');
			$date = date('d/m/Y', $item['timestamp']);
		}
		if ($hourCount != date('g', $item['timestamp'])){
			$hourCount = date('g', $item['timestamp']);
		}
		print_r(date('h:i a ', $item['timestamp']) . drawSongLink($item) . "<br>");
	}
}
if ($pageSelector == 'top'){
	echo '<center><h3>Top 100 Songs</h3></center>';
	$songCount = 0;
	foreach(getTop10Songs($selectedStation) AS $id => $item){
		print_r('Plays(' . $item['plays'] . ') ' . drawSongLink($item) . "<br>");
		$songCount ++;
		if ($songCount == 100) break;
	}
}
if ($pageSelector == 'repeat'){
	checkWorkDay($selectedStation, 3359);
}
exit(1);

// Gets live the rock music feed
$song = getCurrentSong();
if (isset($argv[1])){

}else{
	echo '<pre>';
	print_r('<a href="./?allsongs">All Songs</a> - <a href="./">Last Plays</a> - <a href="./?topsongs">Top Songs</a>' . "\n<hr>");
	if (isset($_REQUEST['test'])){
		$uriString = "";
		$songCount = 0;
		foreach (getTop10Songs() as $item){
			$uri = explode('spotify:track:', $item['uri']);
			if (isset($uri[1])){
				$uriString .= ',' . $uri[1];
			}else{
				$songCount --;
			}
			$songCount ++;
			if ($songCount == 10) break;
		}
		print_r('<iframe width="400" height="450" src="https://embed.spotify.com/?uri=spotify:trackset:TheRockTopSongs:' . $uriString . '" frameborder="0" allowtransparency="true"></iframe>');
	}elseif (isset($_REQUEST['test2'])){
	echo 1;
		foreach(checkWorkDay() AS $id => $item){
			if ($item['count'] > 1){
				$song = getSong($id);
				print_r(drawSongLink($song) ."\n");
				foreach ($item['timestamps'] as $timestamp){
					print_r('---> ' . date('h:i a ', $timestamp) . "\n");
				}
			}
		}
	}elseif (isset($_REQUEST['test3'])){
		// Get the metatune instance. 
		$spotify = MetaTune\MetaTune::getInstance();
		$spotify->autoAddTracksToPlayButton = true; // Will add all searches for tracks into a list.
		$spotify->playButtonHeight = 330; // For viewing the entire playlist
		$spotify->playButtonTheme = "white"; // Changing theme
		$spotify->playButtonView = "list"; // Changing view
		$tracks = array();
		try
		{
			$songCount = 0;
			foreach (getTop10Songs() as $item){
				//echo $songCount . ': ' . $item['uri'] . "\n";
				if ($item['uri'] != ""){
					$tracks[] = $item['uri'];
					$songCount ++;
				}
				
				if ($songCount == 50) break;
			}
			//print_r($tracks);
			echo $spotify->getPlayButtonFromTracks($tracks, "TheRockTop50");
		}
		catch (MetaTuneException $ex)
		{
			die("<pre>Error\n" . $ex . "</pre>");
		}
	}elseif (isset($_REQUEST['test4'])){
		foreach(getSongs() AS $id => $item){
			print_r(drawSongLink($item) ."\n");
		}
	}
	echo '</pre>';	
}
?>
