var RSAkey = 0;

var gTimer;
var gTimerPeriod = 3000;
var resizeTimer; 
var gFlashTimer;
var gFlashTimerPeriod = 800;
var gNewMessageCount = 0;

var gLastId;
var gWorker	= undefined;

var gKeySize = 1024;
var gFileSize = 64000;

var MyPublicKey;
var MyPublicKeyId;
var MyPublicPin;
var YouPublicKey;
var YouPublicKeyId;

var FlagGetMessage = false;

function start() {
	clearTimeout(gTimer);
	clearTimeout(resizeTimer);
	clearTimeout(gFlashTimer);
	if(typeof(gWorker) != "undefined") {
		gWorker.terminate();			
	}
	gWorker		   = undefined;
	RSAkey 		   = 0;
	MyPublicKey    = '';       
	MyPublicKeyId  = '';
	MyPublicPin    = '';	
	YouPublicKey   = '';
	YouPublicKeyId = '';
	gLastId		   = '0';
	$("#ui_status").html('');
	$("#ui_youpin").val('');
	$("#ui_content").html('');
	go('Loader');
	createKey();
	
	var i = 0;
    
	gFlashTimer = setTimeout(function(){
		if (gNewMessageCount) {
			var show = ['************', ''+gNewMessageCount+' новых сообщений. Amnesia'];
			window.document.title = show[i++ % 2];
		}
		gFlashTimer = setTimeout(arguments.callee, gFlashTimerPeriod);
	}, gFlashTimerPeriod);
	
}


// Вывод страницы
function go(page){
	flashStop();
	$(".page").hide();
	$("#p"+page).show();
	if (page=='Share'){
		$('#ui_youpin').focus();
	}
	if (page=='Dialog'){
		$('#ui_message').focus();
	}
	doResize();
}

// Вывод статусных сообщений
function status(msg) {
	$("#ui_status").append("<br>"+msg);
}

// Вывод статусных сообщений
function error(message, update, close) {
	if (update) {
		message += '<br><div onclick="location.reload();">ОБНОВИТЬ</div>';
	}
	if (update) {
		message += '<br><div onclick="history.back();">ЗАКРЫТЬ</div>';
	}
	$("#ui_error").append(message);
	go('Error');
}

function doResize() {  
	var h1 = $("#pDialog").outerHeight(true);
	var h2 = $(".chat_header").outerHeight(true);
	var h3 = $(".chat_footer").outerHeight(true);
	$(".chat_content").height(h1-(h2+h3)); 
}; 

// Загрузка
$(function() {
	if (typeof(Worker) !== "undefined") {
		// Отправка сообщения по контрл + энтер
		$("#ui_youpin").keydown(function (e) {
			flashStop();
			if (e.keyCode == 13) {
				getPublicKeyFromPin();
			}
		});
		
		window.document.onmousemove = function() {
			flashStop();
		};
		
		// Отправка сообщения по контрл + энтер
		$("#ui_message").keydown(function (e) {
			flashStop();
			//if (e.ctrlKey && e.keyCode == 13) {
			if (e.keyCode == 13) {
				crypt();
			}
		});
		
		// Изменение размера окна
		$(window).bind('resize', function() {  
			if (resizeTimer) clearTimeout(resizeTimer);  
			resizeTimer = setTimeout(doResize, 250);  
		});
		
		$("#filefild").change(function(event) {
			$.each(event.target.files, function(index, file) {
			   if (file.size < gFileSize) {
				var reader = new FileReader();
				reader.onload = function(event) { 
				   var text = Base64.encode("{FILEBEGIN}"+event.target.result+"{FILENAME}"+file.name+" ("+file.size+" байт){FILEEND}",true);
				   SendMessage(text);
				   $("#filefild").val("");			   
				};
			  } else {
				alert('Размер файла не может превышать '+gFileSize+' байт');
			  }
			  reader.readAsDataURL(file);
			});
		});

		start();
	} else {
		error("<h2>Браузер не поддерживает технологию HTML5, обновите браузер или воспользуйтесь другим.</h2>",false,true);
	}	
});

	

//-----------------------------------------------------------------------------//
//
//                 Г Е Н Е Р А Ц И Я   К Л Ю Ч А
//
//-----------------------------------------------------------------------------//
// Генерация пароля
function genPass(count){
	var result       = '';
    var words        = '0123456789qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM';
    var max_position = words.length - 1;
    for( i = 0; i < count; ++i ) {
        position = Math.floor ( Math.random() * max_position );
        result = result + words.substring(position, position + 1);
    }
	return result;
}

// Генерация RSA
function createKey() {
	
	gWorker = new Worker("app/js/stream.js");
	gWorker.onmessage = function(event){
		var gkey = event.data;
		var mykey = new RSAKey();
		mykey.setPrivateEx(gkey.n, gkey.e, gkey.d, gkey.p, gkey.q, gkey.dmp1, gkey.dmq1, gkey.coeff);
		ApplayRSAKey(mykey);
	};
	
	gWorker.onerror = function(event){
		error("Неизвестная ошибка<br>"+event.data);
	};
	
	status("<h3>Генерация ключа RSA "+gKeySize+" бит</h3>");
	gWorker.postMessage({pass:genPass(64), bits: gKeySize});			
}

function ApplayRSAKey(rkey){
	if(typeof(rkey) != "undefined") {
		RSAkey 		  = rkey;
		MyPublicKey   = cryptico.publicKeyString(RSAkey);       
		MyPublicKeyId = cryptico.publicKeyID(MyPublicKey);
		
		$('#publickey').val(MyPublicKey);
		$('#myHashCod').val(MyPublicKeyId);
		
		sharePublicKey();
		
		gTimer = setTimeout(function(){
			checkPin();
			GetMessage(MyPublicKeyId, gLastId);
			gTimer = setTimeout(arguments.callee, gTimerPeriod);
		}, gTimerPeriod);
		
	}
}

//
function clearKey(type) {
	error("<h2>Ключи очищены.</h2>",true,true);
}


// Получить дату с милисекундами
function getDateTime() {
	var now     = new Date(); 
	var year    = now.getFullYear();
	var month   = now.getMonth()+1; 
	var day     = now.getDate();
	var hour    = now.getHours();
	var minute  = now.getMinutes();
	var second  = now.getSeconds(); 

	if(month.toString().length == 1) {
		var month = '0'+month;
	}
	if(day.toString().length == 1) {
		var day = '0'+day;
	}   
	if(hour.toString().length == 1) {
		var hour = '0'+hour;
	}
	if(minute.toString().length == 1) {
		var minute = '0'+minute;
	}
	if(second.toString().length == 1) {
		var second = '0'+second;
	}   
	//var dateTime = day+'.'+month+'.'+year+' '+hour+':'+minute+':'+second+'.'+now.getMilliseconds();  
	var dateTime = hour+':'+minute+':'+second;	
	return dateTime;
}
		
//-----------------------------------------------------------------------------//
//
//                          П И Н    К О Д Ы
//
//-----------------------------------------------------------------------------//
function sharePublicKey() {
  status("Получаем ПИН код ключа");
  if (MyPublicKey!=''){
	MyPublicPin = '';
	$.ajax({
		type: "POST",
		url: "ajax.php",
		data: {cmd:'setPubKey', publickey: MyPublicKey}
	}).done(function(msg){
		try {
			var obj = $.parseJSON(msg);
			switch (obj.type){
				case 'success':
					MyPublicPin = obj.data;
					$("#ui_pin").html('<h1>'+MyPublicPin+'</h1>');
					$("#ui_pinstatus").html('Ожидание собеседника');
					//$("#ui_pinstatustime").html('');
					go("Share");
					break;
				case 'error':
					//error('Ошибка сервера: '+obj.msg, true, true);
					break;
			}
		} catch(err) {
			//error('Ошибка клиента: '+err.message, true, true);
		}
	}); 
  } else {
	error('Не сгенерированы ключи', true, true);
  }
}

//---------------------------------------------------------------------------------
// Функция сканирования состояния пина
function checkPin() {
	if ((MyPublicPin != '') && (MyPublicKey !='')) {
		$.ajax({
			type: "POST",
			url: "ajax.php",
			data: {cmd:'checkPin', pin: MyPublicPin, publickey: MyPublicKey}
		}).done(function(msg){
			try {
				var obj = $.parseJSON(msg);
				switch (obj.type){
					case 'wait':
						$("#ui_pinstatus").html('Ожидание собеседника, '+obj.data+' сек.');
						//$("#ui_pinstatustime").html(obj.data+' сек.');
						//console.log('wait');
						break;
					case 'success':
						$("#ui_pinstatus").html('Собеседник получил мой ключ');
						$("#ui_pinstatustime").html('');
						setYouKey(obj.data);
						break;
					case 'error':
						if ((obj.msg=='PIN_NOT_FOUND') || (obj.msg=='PIN_FILE_BAD')){
							start();
						}
						break;
				}
			} catch(err) {
				//error('Ошибка клиента: '+err.message, true, true);
			}
		});
	} else {
		$("#ui_pinstatus").html('');
		$("#ui_pinstatustime").html('');
	}
}

//---------------------------------------------------------------------------------
// Функция получения публичного ключа по пин коду
function getPublicKeyFromPin(pin) {
if (MyPublicKey!=''){

	pin = $("#ui_youpin").val();

	$.ajax({
		type: "POST",
		url: "ajax.php",
		data: {cmd:'getPubKey', pin:pin, publickey: MyPublicKey}
	}).done(function(msg){
		try {
			var obj = $.parseJSON(msg);
			switch (obj.type){
				case 'success':
					setYouKey(obj.data);
					break;
				case 'error':
					$("#ui_youpin").val('');
					break;
			}
		} catch(err) {
			$("#ui_youpin").val('');
		}
	})
}
}

// Применить ключ собеседника
function setYouKey(key) {
	YouPublicKey 	= key;
	YouPublicKeyId	= cryptico.publicKeyID(YouPublicKey);
	
	MyPublicPin = '';
	
	$("#title_users").html("ID Собеседника: "+YouPublicKey);
	
	go('Dialog');
	ViewInfo("<h3>Собеседник подключен</h3><br><b>Отпечаток Вашего ключа:</b> "+MyPublicKeyId.substr(0,4)+".."+MyPublicKeyId.substr(-4)+"<br><b>Отпечаток ключа собеседника:</b> "+YouPublicKeyId.substr(0,4)+".."+YouPublicKeyId.substr(-4));
}










//**********************************************************************************************************//
//																											//
//																											//
//																											//
//**********************************************************************************************************//



function crypt() {
	status("Начало шифрования");
	
	//var Text = Base64.encode(XSSProtect($("#ui_message").val(),true)+"<br><date>"+getDateTime()+"</date>");
	var Text = Base64.encode(XSSProtect($("#ui_message").val(),true));
	SendMessage(Text);
	$("#ui_message").val('');
	$('#ui_message').focus();
	
	status("Конец шифрования");
}		

function decrypt() {
	status("Начало дешифрования");
	$("#SendCryptMessage").val("");
	$("#SignatureText").val("");
	$("#VeryfeID").val("");
	var DecryptionResult = cryptico.decrypt($("#SendDeCryptMessage").val(), RSAkey);
	$("#SendDeMessage").val(Base64.decode(DecryptionResult.plaintext));
	$("#SignatureText").val(DecryptionResult.signature);
	$("#VeryfeID").val(cryptico.publicKeyID(DecryptionResult.publicKeyString));
	status("Конец дешифрования");
}

//**********************************************************************************************************//
//																											//
//																											//
//																											//
//**********************************************************************************************************//

// 
function XSSProtect(msg,br){
	msg = msg.replace(new RegExp("<",'g'),		'&lt;');
	msg = msg.replace(new RegExp(">",'g'),		'&gt;');
	msg = msg.replace(new RegExp('"','g'),		'&quot;');
	msg = msg.replace(new RegExp('"','g'),		'&quot;');
	if (br) {
		msg = msg.replace(/(?:\r\n|\r|\n)/g, '<br>');
	}
	return msg;
}

function filelink(msg){
	//SendMessage("{FILEBEGIN}"+object.data+"{FILENAME}"+file.name+"{FILEEND}");
	//var kavichka = "'";
	//msg = msg.replace(new RegExp("{FILEBEGIN}",'g'),   '<a href="#" onclick="savefile('+kavichka);
	//msg = msg.replace(new RegExp("{FILENAME}",'g'), kavichka+');">');
	//msg = msg.replace(new RegExp("{FILEEND}",'g'),     '</a>');
	
	msg = msg.replace(new RegExp("{FILEBEGIN}",'g'),   '<a href="');
	msg = msg.replace(new RegExp("{FILENAME}",'g'),    '" target="_blank" onclick="alert(\'Внимание!!! Браузер сохранил содержимое файла в своей истории! Зачистите историю!\');">');
	msg = msg.replace(new RegExp("{FILEEND}",'g'),     '</a>');
	
	return msg;
}

// Отправить сообщение	
function SendMessage(text){	
	
	// Отправляем сообщение собеседнику
	var EncryptionResult = cryptico.encrypt(text, YouPublicKey, RSAkey);
	SendCryptMessage(YouPublicKeyId, EncryptionResult.cipher);
	
	// Отправляем копию себе
	if (MyPublicKeyId !== YouPublicKeyId){
		var EncryptionResult = cryptico.encrypt(text, MyPublicKey, RSAkey);
		SendCryptMessage(MyPublicKeyId, EncryptionResult.cipher);
	}
}

// Отправить сообщение	
function SendCryptMessage(target, data){	
	$.ajax({
		type: "POST",
		url: "ajax.php",
		data: {cmd:'set', target: target, data: data}
	}).done(function(msg){
		GetMessage(MyPublicKeyId, gLastId);
	});
}

// Получить сообщения 
function GetMessage(target,id){
if ((RSAkey!=0) && (target!='') && (!FlagGetMessage)) {
	FlagGetMessage = true;
	$.ajax({
		type: "POST",
		url: "ajax.php",
		data: {cmd:'get', target: target, id: id}
	}).done(function(msg){
		try {
			var obj = $.parseJSON(msg);
			gLastId = obj.last;
			switch (obj.type){
				case 'content':
					var records = $.parseJSON(window.atob(obj.data));
					for (var key in records) {
						ViewMessage(records[key]);
					}
					break;
				case 'empty':
					//error('Нет новых сообщений',true,true);
					break;
				case 'error':
					//error('Ошибка сервера: '+obj.data,true,true);
					break;
			}
		} catch(err) {
			error('Ошибка клиента: '+err.message,true,true);
		}
		FlagGetMessage = false;
	});
}
}

function ViewMessage(data){
	
	var DecryptionResult = cryptico.decrypt(data['data'], RSAkey);
	var DecryptionData   = Base64.decode(DecryptionResult.plaintext);
	var DecryptionSig    = DecryptionResult.signature;
	var DecryptionSigId  = cryptico.publicKeyID(DecryptionResult.publicKeyString);
	
	if ((DecryptionSigId == MyPublicKeyId) || (DecryptionSigId == YouPublicKeyId)){
	
	
	DecryptionData  = filelink(DecryptionData);
	
	/*
	date = XSSProtect(AESDecryptCtr(data['date'], gKey, 256),true);
	user = XSSProtect(AESDecryptCtr(data['user'], gKey, 256),true);
	msg  = XSSProtect(AESDecryptCtr(data['msg'],  gKey, 256),true);
	*/
	
	vector = 'me';
	if (DecryptionSigId != MyPublicKeyId) {vector = 'you';}
	
	msgstr = "<table width='100%'><tr>";
	
	msgstr += "<td width='30px' valign='top'>";
	//msgstr += "<div class='bubble_row'>";
	
	if (vector == 'you') {
		// Левая иконка
		msgstr += "<div class='you_icon'>";
		msgstr += "<p class='responsive-img'>";	
		msgstr += "<img class='img-polaroid' src='app/res/img/you.png' style='width: 30px; height: 30px' />";
		msgstr += "</p>";
		msgstr += "</div>";
	}
	
	msgstr += "</td>";
	msgstr += "<td colspan='2'>";
	
	// Сообщение
	//msgstr += "<div class='bubble "+vector+"'><span class='chat_message_title'>"+data['id']+" "+DecryptionSigId+", подпись:"+DecryptionSig+"</span><br />";
	msgstr += "<div class='bubble "+vector+"'>";
	msgstr += "<span class='timelabel'><span class=\"glyphicon glyphicon-time\"></span> "+getDateTime()+"</span><br>";
	msgstr += DecryptionData;
	msgstr += "</div><div style='text-align: right; font-size:10px;'></div>";
	
	msgstr += "</td>";
	msgstr += "<td width='30px' valign='top'>";
	
	if (vector == 'me') {
		// Правая иконка
		msgstr += "<div class='me_icon'>";
		msgstr += "<p class='responsive-img'>";	
		msgstr += "<img class='img-polaroid' src='app/res/img/me.png' style='width: 30px; height: 30px' />";
		msgstr += "</p>";
		msgstr += "</div>";
	}
	
	//msgstr += "</div>";
	//msgstr += "</span>";
	
	msgstr += "</td>";
	msgstr += "</tr></table>";
	
	$('#ui_content').append(msgstr);
	$(".chat_content").animate({ scrollTop: $('.chat_content')[0].scrollHeight}, 800);
	//$('.chat_content').scrollTop($('.chat_content')[0].scrollHeight);
	if (vector == 'you') {flashStart();}
	}
}

function ViewInfo(msg){	
	msgstr = "<table width='100%'><tr>";
	
	msgstr += "<td width='30px' valign='top'>";
	//msgstr += "<div class='bubble_row'>";
	msgstr += "</td>";
	msgstr += "<td colspan='2'>";
	
	// Сообщение
	//msgstr += "<div class='bubble "+vector+"'><span class='chat_message_title'>"+data['id']+" "+DecryptionSigId+", подпись:"+DecryptionSig+"</span><br />";
	msgstr += "<div class='bubble'>";
	msgstr += "<span class='timelabel'><span class=\"glyphicon glyphicon-time\"></span> "+getDateTime()+"</span><br>";
	msgstr += msg;
	msgstr += "</div><div style='text-align: right; font-size:10px;'></div>";
	
	msgstr += "</td>";
	msgstr += "<td width='30px' valign='top'>";
	
	//msgstr += "</div>";
	//msgstr += "</span>";
	
	msgstr += "</td>";
	msgstr += "</tr></table>";
	
	$('#ui_content').append(msgstr);
	$(".chat_content").animate({ scrollTop: $('.chat_content')[0].scrollHeight}, 800);
	//$('.chat_content').scrollTop($('.chat_content')[0].scrollHeight);
}

function flashStart() {
    $('#ui_sound')[0].play();
	window.focus();
	gNewMessageCount++;
}

function flashStop() {
	gNewMessageCount = 0;
	window.document.title = 'Amnesia';
}
