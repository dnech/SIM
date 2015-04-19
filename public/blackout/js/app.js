$(document).ready(function() {
    if (typeof(Worker) !== "undefined") {
		BlackOut = BlackCore({autoinit:false});	
		BlackOut.on('start', ui_showPageKeyGenerate);
		BlackOut.on('stop',  ui_showPageKeyGenerate);
		BlackOut.on('generate', ui_showPageKeyEdit);
		BlackOut.on('destroy', ui_showPageKeyGenerate);
		BlackOut.workerStart();
	} else {
		$.mobile.navigate("#page_notsupport");
	}
	
});

//------------------------------------
//
//               U I
//
//------------------------------------
function ui_showPageKeyGenerate(msg){	
	$("#ui_key_edit").hide();

	$("#pass").val("");
	$("#view_name").val("");
	$("#view_publickey").html("");
	$("#view_publickeyid").val("");
	$("#ui_qrcode").html("");
	
	$("#ui_key_generate").show();
	//HideLoadIcon();
	//document.location.replace("#page_login");
	$.mobile.navigate("#page_login");
}

function ui_showPageKeyEdit(msg){
	//HideLoadIcon();			
	//document.location.replace("#page_home");
	//$.mobile.navigate("#page_contacts");
	
	$("#pass").val("");
	$("#view_name").val($("#name").val());
	
	$("#view_publickey").html(msg.publicKey);
	$("#view_publickeyid").val(msg.publicKeyID);

	genQRCode(msg.publicKey);
	
	$("#ui_key_generate").hide();
	$("#ui_key_edit").show();
}

function ShowLoadIcon(field) {
	//var p = $(field).offset();
	//$("#loading").position({top:p.top, left:p.left});
	//$("#loading").show();
    $.mobile.loading( "show", {
            text: "Генерация ключей...",
            textVisible: true,
            theme: 'b',
            textonly: false,
            html: "<span onclick='ClearKey();' class='ui-bar ui-overlay-a ui-corner-all'><center><img src='img/preloader_1.gif' /><br><h2>Генерация ключей...</h2></center></span>"
    });

}

function HideLoadIcon() {
	//$("#loading").hide();
	$.mobile.loading( "hide" );
}

function ClearKey() {
	BlackOut.destroyKey();
	HideLoadIcon();
}

function genQRCode(text) {
	$("#ui_qrcode").html("");
	var size = $(window).width();
	if ($(window).height()<size) {
		size = $(window).height();
	}
	size = size*0.80;
	
	var qrcode = new QRCode($("#ui_qrcode")[0], {
		text: text,
		width: size,
		height:size,
		colorDark : "#000000",
		colorLight : "#ffffff",
		correctLevel : QRCode.CorrectLevel.H
	});
}

function genKey() {
	HideLoadIcon();
	ClearKey();
	
	var Pass = $("#pass").val();
	var Bits = $("#bits").val();
	
	if (Pass!=''){	
		ShowLoadIcon('#btn_keygen');
		//BlackOut.workInit();
		BlackOut.generateKey(Pass, Bits, function(data){
			if (data.success) {
				HideLoadIcon();
			} else {
				HideLoadIcon();
			}
			//BlackOut.publicKey(function(data){
			//	$("#ui_key_generate").hide();
			//	$("#ui_key_edit").show();
			//	$("#view_publickey").html(data.return);
			//	genQRCode(data.return);
			//	BlackOut.publicKeyID(function(data){
			//		$("#view_publickeyid").val(data.return);
			//		$("#pass").val("");
			//		HideLoadIcon();
			//		$("#view_name").val($("#name").val());
			//		document.location.replace("#page_home");
			//	});
			//});	
		});
	} else {
		
	}	
}

function ui_addUser(){
	var name = $("#addusername").val();
	var pk = $("#adduserpk").val();
	addUser(pk, name);
	
}

function addUser(publickey, name){
	var user = BlackOut.addUser(name, publickey);
	if (typeof($("#user_"+user.id).get(0)) === 'undefined') { 
		var funget = "showUser('"+user.id+"');";
		var fundel = "delUser('"+user.id+"');";
		
		var shablon = '';
		shablon += '<li data-icon="user" id="user_'+user.id+'">';
		shablon += '	<a href="#" onclick="'+funget+'" title="'+user.publickey+'">';
		shablon += '		<h3 id="user_'+user.id+'_name">'+user.name+'</h3><br><p>ID:'+user.id+'</p>';
		shablon += '	</a>';
		shablon += '	<a href="#UserPopupMenu" data-rel="popup" data-transition="slideup" class="ui-btn ui-corner-all ui-shadow ui-btn-inline ui-icon-gear ui-btn-icon-left ui-btn-a">...</a>';
		//shablon += '	<a href="#UserPopupMenu_'+user.id+'" data-rel="popup" data-transition="slideup" class="ui-btn ui-corner-all ui-shadow ui-btn-inline ui-icon-gear ui-btn-icon-left ui-btn-a">...</a>';
		//shablon += '	<div data-role="popup" id="popupMenu_'+user.id+'" data-theme="b">';
        //shablon += '	<ul data-role="listview" id="popupMenuList_'+user.id+'" data-inset="true" style="min-width:210px;">';
        //shablon += '	    <li data-role="list-divider">Choose an action</li>';
        //shablon += '	    <li><a href="#">View details</a></li>';
        //shablon += '	    <li><a href="#">Edit</a></li>';
        //shablon += '	    <li><a href="#">Disable</a></li>';
        //shablon += '	    <li><a href="#">Delete</a></li>';
        //shablon += '	</ul>';
		//shablon += '	</div>';
		shablon += '</li>';
		
		$("#ui-userlist").append(shablon).listview("refresh");
		$("#popupMenuList_"+user.id).listview("refresh");
	} else {
		$("#user_"+user.id+"_name").html(user.name);
	}
}

function delUser(pubKeyId){
	BlackOut.delUser(pubKeyId);
	$("#user_"+pubKeyId).remove();
	//$("#ui-userlist").listview("refresh");
}

function showUser(id){
	var user = BlackOut.getUser(id);
	$("#ui_chat_title").html(user.name);
	$("#ui-messages").html("");
	fillMessages(user);
	$.mobile.navigate("#page_messages");
}

function fillMessages(user){
	user.messages.forEach(function(object, index) {
		$("#ui-messages").append(object+'<br>');
	});
}

function addMessages(userid, message){
	var user = BlackOut.getUser(userid);
	user.messages.push(message);
	//Добавить добавление во въю если оно отображается
	//$("#ui-messages").append(object+'<br>');
}

function genPass(count) {
	$("#pass").val(BlackOut.genPass(count));
}

