<?php

$dbtype   = 'file';
//$fn = 'db/chat.db';

//$dbtype   = 'sqlite3';
//$fn = 'db/chat.sqlite';

$cmd = (isset($_POST["cmd"])) ? $_POST["cmd"] : 'emp';

function SendAnswer($id, $type, $msg){
	exit(json_encode(array('last' => $id, 'time' => time(), 'type' =>$type, 'data' => $msg)));
}

//====================================  ФАЙЛОВЫЙ РЕЖИМ ======================================================================
if ($dbtype=='file') {

//--------------------------------------------------------------------------------------------------------------------------------------------
// Сохранить запись	
if ($cmd == 'set'){
	$record = array();
	$record['date'] = $_POST["date"];
	$record['tag']  = $_POST["tag"];
	$record['user'] = $_POST["user"];
	$record['msg']  = $_POST["msg"];
	
	$fn = 'db/'.base64_encode($record['tag']).'.db';
	
	$base = base64_encode(json_encode($record))."\n";
	file_put_contents($fn, $base, FILE_APPEND | LOCK_EX);
} 

//--------------------------------------------------------------------------------------------------------------------------------------------
// Прочитать записи
if ($cmd == 'get'){

	$count   = 0;
	$content = "";
	$id      = $_POST["id"];
	$tag     = $_POST["tag"];
	$res 	 = array();
	
	$fn = 'db/'.base64_encode($tag).'.db';
	
	if (!file_exists($fn)) {SendAnswer(0,'error','DB file not exists!');}
	
	$file = @fopen($fn,"r");
	if(!$file){SendAnswer(0,'error','DB file open error!');} 
		
	while(!feof($file)){
		$fileline = fgets($file);
		if (++$count > $id) {
			$record = json_decode(base64_decode($fileline), true);
			if (($record['msg']!='') && ($record['tag']==$tag)) {
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
	$fn  = 'db/'.base64_encode($tag).'.db';
	unlink($fn);
}



?>