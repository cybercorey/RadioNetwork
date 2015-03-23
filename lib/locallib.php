<?php
header("Content-Type: text/html; charset=UTF-8");
date_default_timezone_set("Pacific/Auckland");
define("DEBUG", true);
// Used Functions
function runSQL($sql){
	$con=mysqli_connect("localhost","<user>","<password>","<dbname>");
	$sql = trim($sql);
	//var_dump($sql);
	//$sql = mysqli_real_escape_string($sql);
	$result = mysqli_query($con,$sql);
	mysqli_close($con);
	return $result;
}
function getSongID($song){
	$result = runSQL('SELECT id FROM song WHERE title = "' . $song['title'] . '" AND artist = "' . $song['artist'] . '"');
	$songid = 0;
	while($row = mysqli_fetch_array($result)){
		$songid = $row['id'];
	}
	return $songid;
}
function getPrevSongID($station){
	$result = runSQL('SELECT songid FROM play WHERE station = "' . $station . '" ORDER BY timestamp ASC');
	$songid = 0;
	while($row = mysqli_fetch_array($result)){
		$songid = $row['songid'];
	}
	return $songid;
}
function listSongs($station){
	$result = runSQL('SELECT s.*, p.timestamp FROM play AS p, song as s WHERE p.songid = s.id AND p.station = "' . $station . '" ORDER BY timestamp DESC LIMIT 50');
	$songs = null;;
	while($row = mysqli_fetch_array($result)){
		$songs[] = $row;
	}
	return $songs;
}
function getTop10Songs($station){
	$result = runSQL('SELECT DISTINCT s.* FROM song as s, play AS p WHERE p.songid = s.id AND p.station = "' . $station . '" ORDER BY s.artist, s.title DESC');
	$songs = null;;
	while($row = mysqli_fetch_array($result)){
		$song['id'] = $row['id'];
		$song['title'] = $row['title'];
		$song['uri'] = $row['uri'];
		$song['artist'] = $row['artist'];
		$song['plays'] = playCount($row['id'], $station);
		$songs[] = $song;
	}
	aasort($songs,"plays");
	return $songs;
}
function aasort (&$array, $key) {
    $sorter=array();
    $ret=array();
    reset($array);
    foreach ($array as $ii => $va) {
        $sorter[$ii]=$va[$key];
    }
    arsort($sorter);
    foreach ($sorter as $ii => $va) {
        $ret[$ii]=$array[$ii];
    }
    $array=$ret;
}
function playCount($songid, $station){
	$result = runSQL("SELECT count(songid) as songid FROM play WHERE songid = '" . $songid . "' AND station = '". $station ."'");
	$songid = 0;
	while($row = mysqli_fetch_array($result)){
		$songid = $row['songid'];
	}
	return $songid;
}
function getSongs($station){
	$result = runSQL('SELECT DISTINCT s.* FROM song as s, play AS p WHERE p.songid = s.id AND p.station = "' . $station . '" ORDER BY s.artist, s.title DESC');
	$songs = null;
	while($row = mysqli_fetch_array($result)){
		$songs[] = $row;
	}
	return $songs;
}
function getAllSongs(){
	$result = runSQL("SELECT s.* FROM song as s ORDER BY s.artist, s.title DESC");
	$songs = null;;
	while($row = mysqli_fetch_array($result)){
		$songs[] = $row;
	}
	return $songs;
}
// Old Functions (may not be used)
function getSong($id){
	$result = runSQL('SELECT * FROM song WHERE id = "' . $id . '"');
	while($row = mysqli_fetch_array($result)){
		return $row;
	}
}
function checkWorkDay($selectedStation, $song){
	if ($selectedStation == "The Rock" && !(date('N', strtotime(strtolower(date("l", time())))) >= 6)){
		$startTime = strtotime("9am", time());
		$endTime = strtotime("5pm", time());
		$result = runSQL("SELECT p.* FROM play as p WHERE p.songid = " . $song . " AND p.station = '" . $selectedStation . "' AND p.timestamp > " . $startTime . " AND p.timestamp < " . $endTime);
		$songcounter = null;
		$playtime;
		while($row = mysqli_fetch_array($result)){
			if (isset($songcounter['count'])){
				$songcounter['count'] ++;
				$songcounter['timestamps'][] = $row['timestamp'];
			}else{
				$songcounter['count'] = 1;
				$songcounter['timestamps'][] = $row['timestamp'];
			}
		}
		$output = null;
		if($songcounter['count'] > 1){
			$song = getSong($song);
			$output = drawSong($song) . "\n";
			$output .= date('l ga - ', $startTime) . date('ga d/m/Y', $endTime) . "\n";
			foreach ($songcounter['timestamps'] as $key => $value) {
				$output .=  "Played at: " . date("F j, Y, g:i a", $value) . "\n";  
			};
			mail("cybercorey@gmail.com","ROCK DUPLICATE",$output,"From: thatscript@cybercorey.net\n");
			mail("jivetonto@gmail.com","ROCK DUPLICATE",$output,"From: thatscript@cybercorey.net\n");
			echo $output . "\n";
		}
	}
}
function drawSong($song){
	return $song['artist'] . ' - ' . $song['title'];
}
function drawSongLink($song){
	if ($song['uri'] != ""){
		return '<a href="' . $song['uri'] . '">' . $song['artist'] . ' - ' . $song['title'] . '</a>';
	}else{
		return $song['artist'] . ' - ' . $song['title'];
	}
}
// New Functions
function cronJob($station){
	$spotify = MetaTune\MetaTune::getInstance();
	foreach($station AS $item){
		$song = $item->getSong();
		if ($song['title'] == "" && $song['artist'] == "") continue;
		//add song instance if required or get song instance
		$songinstance = getSongID($song);
		if ($songinstance == 0){
			runSQL('INSERT INTO song (title, artist) VALUES ("'. $song['title'] . '", "' . $song['artist'] . '")');
			$songinstance = getSongID($song);
			$response = $spotify->searchTrack( $song['title'] . ' - ' . $song['artist']);
			if (count($response) != 0 ){
				runSQL('UPDATE song SET uri="' . $response[0]->getURI() . '" WHERE id = "' . $songinstance . '"');
			}
		}
		//save song instance
		if (getPrevSongID($item->name) != $songinstance) {
			#new song instance
			runSQL("INSERT INTO play (songid, timestamp, station) VALUES ('". $songinstance . "', '" . time() . "', '" . $item->name . "')");
			checkWorkDay($item->name, $songinstance);
		}
	}
}
// Radio Stations
class TheRock { 
	public $name = "The Rock";
	public static function getSong() { 
		$track = file_get_contents('http://www.therock.net.nz/Portals/0/Inbound/NowPlaying/NowPlaying.aspx?rand=' . rand());
		$xml = simplexml_load_string($track);
		$json = json_encode($xml);
		$array = json_decode($json,TRUE);
		$song['title'] = trim($array['audio'][0]['title']);
		$song['artist'] = trim($array['audio'][0]['artist']);
		return $song;
	} 
}
class TheEdge { 
	public $name = "The Edge";
	public static function getSong() { 
		$track = file_get_contents('http://www.theedge.co.nz/Portals/0/Inbound/NowPlaying/NowPlaying.aspx?rand=' . rand());
		$xml = simplexml_load_string($track);
		$json = json_encode($xml);
		$array = json_decode($json,TRUE);
		$song['title'] = trim($array['audio'][0]['title']);
		$song['artist'] = trim($array['audio'][0]['artist']);
		return $song;
	} 
}
class GeorgeFM { 
	public $name = "George FM";
	public static function getSong() { 
		$track = file_get_contents('http://www.georgefm.co.nz/Portals/0/Inbound/NowPlaying/nowplaying.aspx?rand=' . rand());
		$xml = simplexml_load_string($track);
		$json = json_encode($xml);
		$array = json_decode($json,TRUE);
		$song['title'] = trim($array['audio']['title']);
		$song['artist'] = trim($array['audio']['artist']);
		return $song;
	} 
}
class TheSound{ 
	public $name = "The Sound";
	public static function getSong() { 
		$track = file_get_contents('http://www.thesound.co.nz/Portals/0/Inbound/NowPlaying/NowPlaying.aspx?rand=' . rand());
		$xml = simplexml_load_string($track);
		$json = json_encode($xml);
		$array = json_decode($json,TRUE);
		$song['title'] = trim($array['audio'][0]['title']);
		$song['artist'] = trim($array['audio'][0]['artist']);
		return $song;
	} 
}
class Hauraki{ 
	public $name = "Hauraki";
	public static function getSong() { 
		$track = file_get_contents('http://www.hauraki.co.nz/plnowplayingdata/?time=' . rand());
		$xml = simplexml_load_string($track);
		$json = json_encode($xml);
		$array = json_decode($json,TRUE);
		$song['title'] = trim($array['li'][5]['div']['div']['div'][0]);
		$song['artist'] = trim($array['li'][5]['div']['div']['div'][1]);
		return $song;
	} 
}
// class ZM{ 
// 	public $name = "ZM";
// 	public static function getSong() { 
// 		$track = file_get_contents('http://www.zmonline.com/plnowplayingdata/?time=' . rand());
// 		$xml = simplexml_load_string($track);
// 		$json = json_encode($xml);
// 		$array = json_decode($json,TRUE);
// 		$song['title'] = trim($array['li'][5]['div']['div'][0]);
// 		$song['artist'] = trim($array['li'][5]['div']['div'][1]);
// 		return $song;
// 	} 
// }
//class Flava{ 
//	public $name = "Flava";
//	public static function getSong() { 
//		$track = file_get_contents('http://www.flava.co.nz/plnowplayingdata/?time=' . rand());
//		$xml = simplexml_load_string($track);
//		$json = json_encode($xml);
//		$array = json_decode($json,TRUE);
//		$song['title'] = trim($array['li'][5]['div']['div'][0]);
//		$song['artist'] = trim($array['li'][5]['div']['div'][1]);
//		return $song;
//	} 
//}
class TheCoast{ 
	public $name = "The Coast";
	public static function getSong() { 
		$track = file_get_contents('http://www.thecoast.net.nz/plnowplayingdata/?time=' . rand());
		$xml = simplexml_load_string($track);
		$json = json_encode($xml);
		$array = json_decode($json,TRUE);
		$song['title'] = trim($array['li'][5]['div']['div'][0]);
		$song['artist'] = trim($array['li'][5]['div']['div'][1]);
		return $song;
	} 
}
// Grab radio stations
$station[] = new TheRock; 
$station[] = new TheEdge; 
//$station[] = new GeorgeFM; 
$station[] = new TheSound; 
$station[] = new Hauraki; 
//$station[] = new ZM; 
//$station[] = new Flava; 
$station[] = new TheCoast; 

if(DEBUG) {
    ini_set("display_errors", "1");
    error_reporting(E_ALL);
    ini_set('error_reporting', E_ALL);
} else {
    ini_set("display_errors", "0");
    error_reporting(0);
    ini_set('error_reporting', 0);
}

spl_autoload_register(function($className) { 
    require_once('./lib/' . str_replace('\\', '/', ltrim($className, '\\')) . '.class.php'); 
}); 
?>
