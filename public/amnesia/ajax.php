<?php

$dbtype   = 'file';
$expire_pin_time = (60*5); // Удалять пины старее 5 минуты
$expire_db_time = 30;      // Удалять историю сообщений старее 0.5 минуты

//$dbtype   = 'sqlite3';
//$fn = 'db/chat.sqlite';

$cmd = (isset($_POST["cmd"])) ? $_POST["cmd"] : 'emp';

clear_old_files("db/pin/", $expire_pin_time); 
clear_old_files("db/msg/",  $expire_db_time); 

function clear_old_files($dir, $expire_time){
	//$expire_time = 60; // Время через которое файл считается устаревшим (в сек.)
	//$dir = "pin/";
	if (is_dir($dir)) {  // проверяем, что $dir - каталог
		if ($dh = opendir($dir)) { // открываем каталог
			// читаем и выводим все элементы
			// от первого до последнего
			while (($file = readdir($dh)) !== false) {
				// текущее время
				$time_sec=time();
				// время изменения файла
				$time_file=filemtime($dir . $file);
				// тепрь узнаем сколько прошло времени (в секундах)
				$time=$time_sec-$time_file;

				$unlink = $dir.$file;

				if (is_file($unlink)){
					if ($time>$expire_time){
						if (unlink($unlink)){
							//echo 'Файл удален';
						}else {
							//echo 'Ошибка при удалении файла';
						}
					}
				}
			}
		// закрываем каталог
		closedir($dh);
		}
	}
}

function SendAnswer($id, $type, $msg){
	exit(json_encode(array('last' => $id, 'time' => time(), 'type' =>$type, 'data' => $msg)));
}

//====================================  ФАЙЛОВЫЙ РЕЖИМ ======================================================================
if ($dbtype=='file') {

//--------------------------------------------------------------------------------------------------------------------------------------------
// Сохранить запись	
if ($cmd == 'set'){
	$fn = 'db/msg/'.base64_encode($_POST['target']).'.db';
	$b64 = base64_encode($_POST["data"])."\n";
	file_put_contents($fn, $b64, FILE_APPEND | LOCK_EX);
} 

//--------------------------------------------------------------------------------------------------------------------------------------------
// Прочитать записи
if ($cmd == 'get'){

	$count   = 0;
	$content = "";
	$id      = $_POST["id"];
	$target  = $_POST["target"];
	$res 	 = array();
	
	$fn = 'db/msg/'.base64_encode($target).'.db';
	
	if (!file_exists($fn)) {SendAnswer(0,'error','DB_FILE_NOT_EXIST');}
	
	$file = @fopen($fn,"r");
	if(!$file){SendAnswer(0,'error','DB_FILE_OPEN!');} 
		
	while(!feof($file)){
		$fileline = fgets($file);
		if (++$count > $id) {
			$record = array();
			$record['data'] = base64_decode($fileline);
			if ($record['data']!='') {
				$mid = $count;
				$record['id'] = $mid;
				$res[$mid] = $record;
			}
		}
	}
	fclose($file);
	
	if (empty($res)) {
		SendAnswer($count-1,'empty','Нет новых сообщений');
	} else {
		SendAnswer($count-1,'content',base64_encode(json_encode($res)));
	}
	
}

//--------------------------------------------------------------------------------------------------------------------------------------------
// Сохранить pin cod	
if ($cmd == 'setPubKey'){
	
	$pin = mt_rand(1000, 9999);
	$fn = 'db/pin/'.$pin.'.pin';
	while (file_exists($fn)) {
		$pin = mt_rand(1000, 9999);
		$fn = 'db/pin/'.$pin.'.pin';
	}
	//$b64 = $_POST["publickey"]."\n";
	$b64 = base64_encode($_POST["publickey"])."\n";
	file_put_contents($fn, $b64, FILE_APPEND | LOCK_EX);
	exit(json_encode(array('type' =>'success', 'data' => $pin, 'msg' => 'Для '.$b64.' cформирован Пин Код')));
}

//--------------------------------------------------------------------------------------------------------------------------------------------
// Проверить пин код	
if (($cmd == 'checkPin') || ($cmd == 'getPubKey')){

	$pin = eregi_replace("([^0-9])", "", $_POST["pin"]);
	if (strlen($pin)==4) {
		$fn = 'db/pin/'.$pin.'.pin';
		if (!file_exists($fn)) {
			//$msg = ($cmd == 'checkPin') ? 'MY_PIN_NOT_FOUND' : 'YOU_PIN_NOT_FOUND';
			exit(json_encode(array('type' =>'error', 'data' => $pin, 'msg' => 'PIN_NOT_FOUND')));
		}
		
		$file = @fopen($fn,"r");
		if(!$file){
			exit(json_encode(array('type' =>'error', 'data' => $pin, 'msg' => 'PIN_FILE_BAD')));
		} 
		//$b64 = $_POST["publickey"];
		$b64 = base64_encode($_POST["publickey"]);		
		$i = 0;
		$mykey = '';
		$youkey = '';
		
		$expire_time = $expire_pin_time; // Время через которое файл считается устаревшим (в сек.)
		$time_sec=time();
		$time_file=filemtime($fn);
		$time=$expire_time-($time_sec-$time_file);
				
		while(!feof($file)){
			$i++;
			$line = fgets($file);
			if ($i==1){$mykey = $line;}
			if ($i==2){$youkey = $line;}
			if ($i>3){
				exit(json_encode(array('type' =>'error', 'data' => $pin, 'msg' => 'PIN_FILE_BAD')));
			}
		}
		fclose($file);
		
		// Запросил владелец
		if ($cmd == 'checkPin'){
			if ($mykey != $b64) {
					if ($youkey == ''){
						exit(json_encode(array('type' =>'wait', 'data' => $time, 'msg' => 'Ожидание собеседника')));
					} else {
						exit(json_encode(array('type' =>'success', 'data' => base64_decode($youkey), 'msg' => 'Пин код собеседника')));
					}	
			} else {
				exit(json_encode(array('type' =>'error', 'data' => $pin, 'msg' => 'MY_PIN_FILE_BAD')));
			}
		}
		
		// Запросил собеседник
		if ($cmd == 'getPubKey'){
			if ($youkey != $b64) {
				file_put_contents($fn, $b64."\n", FILE_APPEND | LOCK_EX);
			}
			exit(json_encode(array('type' =>'success', 'data' => base64_decode($mykey), 'msg' => 'Пин код собеседника')));
		}
	} 
	exit(json_encode(array('type' =>'error', 'data' => $pin, 'msg' => 'PIN_FILE_BAD')));
}

/*
//--------------------------------------------------------------------------------------------------------------------------------------------
// Получаем пин код	
if ($cmd == 'getPubKey'){

	$pin = eregi_replace("([^0-9])", "", $_POST["pin"]);
	if (strlen($pin)==4) {
		$fn = 'pin/'.$pin.'.pin';
		if (!file_exists($fn)) {SendAnswer(0,'error','Pin file not exists!');}
		$file = @fopen($fn,"r");
		if(!$file){SendAnswer(0,'error','Pin file open error!');} 
		$b64 = base64_encode($_POST["publickey"]);	
		while(!feof($file)){
			$fileline = fgets($file);
			if ($fileline != $b64) {
				//unlink($fn);
				exit(json_encode(array('type' =>'success', 'data' => $fileline, 'msg' => 'Пин код собеседника')));
			} else {
				exit(json_encode(array('type' =>'error', 'data' => "exists", 'msg' => 'Пин код '.$pin.' ещё существует')));
			}
		}
		fclose($file);
	} 
	
	exit(json_encode(array('type' =>'error', 'data' => "notexists", 'msg' => 'Нет такого пин кода')));

}
*/

}

//====================================  SQLITE3 РЕЖИМ ======================================================================
if ($dbtype=='sqlite3') {
	// Открываем доступ к базе
	if (file_exists($fn)) {
		$db = new SQLite3($fn);
	} else {
		$db = new SQLite3($fn);
		// Создадим новую базу данных 
		$db->exec("CREATE TABLE messages 
								  (id INTEGER PRIMARY KEY, 
								   tag TEXT,
								   date TEXT,
								   user TEXT, 
								   msg TEXT);"); 
	}
	
	
	if ($cmd == 'set'){
		// Сохранить запись
		$db->exec("INSERT INTO messages(tag, date, user, msg) VALUES ('".$_POST["tag"]."', '".time()."', '".$_POST["user"]."', '".$_POST["msg"]."');"); 
	} 
	
	if ($cmd == 'get'){
		// Прочитать записи
		$content = "";
		$LastId = $_POST["id"];
		
		// Сделаем выборку данных 
		$results = $db->query("SELECT * FROM messages WHERE tag='".$_POST["tag"]."' AND id>'".$LastId."';"); 
		
		// В цикле выведем все полученные данные 
		while ($array = $results->fetchArray())  
		{ 
		  $LastId = $array['id'];
		  $time = date('d.m.Y H:i:s', $array['date']);
		  $content .= "<br>------------------".$array['id']."------------------------<br>".$array['tag']."<br><CRYPT>".$array['user']."</CRYPT> (".$time.")<br><CRYPT>".$array['msg']."</CRYPT>";
		  //echo($array['field1'].$array['field2']." (id записи:".$array['id'].")<br />"); 
		}
		echo json_encode(array('LastId' => $LastId, 'Content' => base64_encode($content)));
	}
}

//====================================  ГИБРИДНЫЙ РЕЖИМ ======================================================================
//--------------------------------------------------------------------------------------------------------------------------------------------
// Удалить все записи
if ($cmd == 'del'){
	$tag = $_POST["tag"];
	$fn  = 'db/msg/'.base64_encode($tag).'.db';
	unlink($fn);
}



?>