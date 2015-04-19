var gTag		= '#Default';
var gName		= 'John';
var gKey		= '';
var gLastId		= '0';
var gDebuge		= false;

var gTimer;
var gLastTime1	= '';
var gLastTime2	= '';

var gDomChat 		= '.chat';
var gDomLogin 		= '.chat_login';
var gDomHead 		= '';
var gDomContent		= '.chat_content';
var gDomFooter		= '';

var gDomFieldTag	  = '#chat_login_tag';
var gDomFieldName	  = '#chat_login_name';
var gDomFieldPassword = '#chat_login_pass';
var gDomFieldMessages = '#chat_message';
var gDomFieldDebuge   = '#chat_login_debuge';

// Загрузка
$(function() {
	getCookie();
	
	// Отправка сообщения по контрл + энтер
    $(gDomFieldMessages).keydown(function (e) {
		if (e.ctrlKey && e.keyCode == 13) {
			SetMessage();
		}
	});
	
	$(gDomChat).height($(window).height()-135);
	
	$(window).resize(function(){
		$(gDomChat).height($(window).height()-135);
	});
	
	

	$("#filefild").change(function(event) {
		$.each(event.target.files, function(index, file) {
		   var reader = new FileReader();
		   reader.onload = function(event) { 
			   SendMessage("{FILEBEGIN}"+event.target.result+"{FILENAME}"+file.name+"{FILEEND}");
			   $("#filefild").val("");			   
		  }; 
		  reader.readAsDataURL(file);
		});
	});

});

// Вывод отладочной информации
function Debuge(msg){
	if (gDebuge){
		$(gDomContent).append(msg);
	}
}

// Вывод заголовка
function SetTitle(){
 var status = "ok.ico";
 if (gLastTime1==gLastTime2) {status = "error.ico";}
	$(".chat_title").html("<img src='img/"+status+"' style='width: 25px; height: 25px' /> "+gTag+" : "+gName);
 gLastTime2=gLastTime1;	
}

function setCookie() {
	// Работа с cookie
	var checked = $("#check_tag").prop("checked");
	if (checked) {
		$.cookie('tag',$(gDomFieldTag).val());
	} else {
		$.removeCookie('tag');
	}
	
	var checked = $("#check_pass").prop("checked");
	if (checked) {
		$.cookie('pass',$(gDomFieldPassword).val());
	} else {
		$.removeCookie('pass');
	}
	
	var checked = $("#check_name").prop("checked");
	if (checked) {
		$.cookie('name',$(gDomFieldName).val());
	} else {
		$.removeCookie('name');
	}
}

function getCookie() {
	// Работа с cookie
	if ($.cookie('tag') !== undefined) {
		$(gDomFieldTag).val($.cookie('tag'));
		$("#check_tag").prop("checked", true);
	} else {$("#check_tag").prop("checked", false);}
	if ($.cookie('pass') !== undefined) {
		$(gDomFieldPassword).val($.cookie('pass'));
		$("#check_pass").prop("checked", true);
	} else {$("#check_pass").prop("checked", false);}
	if ($.cookie('name') !== undefined) {
		$(gDomFieldName).val($.cookie('name'));
		$("#check_name").prop("checked", true);
	} else {$("#check_name").prop("checked", false);}
}

// Выбор режима сообщения/настройки
function ShowChat(){
	setCookie();
	
	$("#filefild").val("");
	
	gTag  = "#"+$(gDomFieldTag).val();
	gName = $(gDomFieldName).val();		
	gKey  = $(gDomFieldPassword).val();
		
	SetTitle();
		
	if ((gTag=='#') || (gName=='') || (gKey=='')){
		$(gDomFieldDebuge).text("Заполните все поля!");
	} else {
		gLastId = "0";
		$(gDomContent).text("");
		$(gDomLogin).hide();
		$("#chat_panel").show();
		
		SendMessage("Я вошел в чат!");
		
		gTimer = setTimeout(function run() {
			GetMessage(gLastId);
			gTimer = setTimeout(run, 3000);
		}, 3000);
	}
}

function ShowSettings(logoff){
	getCookie();
	if (logoff) {
		SendMessage("Я вышел из чата!");
	}
	clearTimeout(gTimer);
	$(gDomFieldDebuge).text("");
	$("#chat_panel").hide();
	$(gDomLogin).show();
}

// Отправить сообщение	
function SetMessage(){
	SendMessage($(gDomFieldMessages).val());
}

// Отправить сообщение	
function SendMessage(msg){
	// Пользователь
	var CryptUser = AESEncryptCtr(XSSProtect(gName,false), gKey, 256);
	
	// Дата
	var now  = new Date();
	var day  = ("0"+now.getDate()).substr(-2);
	var mon  = ("0"+now.getMonth()).substr(-2);
	var hou  = ("0"+now.getHours()).substr(-2);
	var min  = ("0"+now.getMinutes()).substr(-2);
	var sec  = ("0"+now.getSeconds()).substr(-2);
	var CryptDate = AESEncryptCtr(day+'.'+mon+'.'+now.getFullYear()+' '+hou+':'+min+':'+sec, gKey, 256);
	
	// Сообщение
	var CryptMsg = XSSProtect(msg,false);
	CryptMsg  = AESEncryptCtr(CryptMsg, gKey, 256);
	
	$.ajax({
		type: "POST",
		url: "ajax.php",
		data: {cmd:'set', tag: gTag, date: CryptDate, user: CryptUser, msg: CryptMsg}
	}).done(function(msg){
		$(gDomFieldMessages).val("");
		Debuge(msg);
		GetMessage(gLastId);
	});
}

// Получить сообщения 
function GetMessage(id){
	$.ajax({
		type: "POST",
		url: "ajax.php",
		data: {cmd:'get', tag: gTag, id: id}
	}).done(function(msg){
		Debuge(msg);
		try {
			var obj = $.parseJSON(msg);
			gLastTime1 = obj.time;
			if (gLastId > obj.last){
				ViewInformation('История очищена');
			}
			gLastId = obj.last;
			switch (obj.type){
				case 'content':
					var records = $.parseJSON(window.atob(obj.data));
					for(var key in records) {ViewMessage(records[key]);}
					$(gDomContent).scrollTop($(gDomContent)[0].scrollHeight);
					break;
				case 'empty':
					Debuge('Нет новых сообщений ('+gLastTime1+')');
					break;
				case 'error':
					Debuge('Ошибка сервера: '+obj.data);
					break;
			}
		} catch(err) {
			Debuge('Ошибка клиента: '+err.message);
		}	
	});
	SetTitle();
}

// Удалить сообщения
function DelMessages(id){
	$.ajax({
		type: "POST",
		url: "ajax.php",
		data: {cmd:'del', tag: gTag, id: id}
	}).done(function(msg){
		ShowSettings(false);
	});
}

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

// Сообщение кому-то
function AddTo(user){
	//$(gDomFieldMessages).val("<span class='chat_message_to'>"+$(gDomFieldMessages).val()+user+" </span>");
	$(gDomFieldMessages).val($(gDomFieldMessages).val()+user);
}

function ViewInformation(msg){
	msgstr = "<div class='bubble'><center><span class='chat_message_title'>"+msg+"</span><center></div>";
	$(gDomContent).append(msgstr);
}

function ViewMessage(data){
	date = XSSProtect(AESDecryptCtr(data['date'], gKey, 256),true);
	msg  = XSSProtect(AESDecryptCtr(data['msg'],  gKey, 256),true);
	user = XSSProtect(AESDecryptCtr(data['user'], gKey, 256),true);
	
	msg  = filelink(msg);
	
	vector = 'me';
	if (user!=gName) {vector = 'you';}
	
	//msgstr = "ID: "+marray['id']+" Дата: "+date+" Сообщение: "+msg+" Тэг: "+marray['tag']+" Пользователь: "+user+"<br>";
	msgstr = "<table width='100%'><tr>";
	
	msgstr += "<td width='60px' valign='top'>";
	//msgstr += "<div class='bubble_row'>";
	
	if (user==gName) {
		// Левая иконка
		msgstr += "<div class='me_icon'>";
		msgstr += "<p class='responsive-img'>";	
		msgstr += "<img class='img-polaroid' src='img/me.png' style='width: 50px; height: 50px' />";
		msgstr += "</p>";
		msgstr += "</div>";
	}
	
	msgstr += "</td>";
	msgstr += "<td>";
	
	strfunc = 'AddTo("'+user+':");';
	
	// Сообщение
	msgstr += "<div class='bubble "+vector+"'><span class='chat_message_title' onClick='"+strfunc+"'>"+user+" ("+date+")</span><br />";
	msgstr += msg;
	msgstr += "</div>";
	
	msgstr += "</td>";
	msgstr += "<td width='60px' valign='top'>";
	
	if (user!=gName) {
		// Правая иконка
		msgstr += "<div class='you_icon'>";
		msgstr += "<p class='responsive-img'>";	
		msgstr += "<img class='img-polaroid' src='img/you.png' onClick='"+strfunc+"' style='width: 50px; height: 50px' />";
		msgstr += "</p>";
		msgstr += "</div>";
	}
	
	//msgstr += "</div>";
	//msgstr += "</span>";
	
	msgstr += "</td>";
	msgstr += "</tr></table>";
	
	$(gDomContent).append(msgstr);
}
