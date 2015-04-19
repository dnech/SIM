/*
 *  BlackCore version 0.1  -  Copyright 2014 D.B. Nechaev
 *
 *  This program is free software; you can redistribute it and/or
 *  modify it under the terms of the GNU General Public License as
 *  published by the Free Software Foundation; either version 2 of the
 *  License, or (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 *  General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, write to the Free Software
 *  Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA
 *  02111-1307 USA
 */
function initValue(value, def){
	if (typeof(value) === 'undefined') {
		return def;
	}else{
		return value;
	}
}
 
var BlackCore = (function(cfg){

    var my = cfg || {};
	my.debuglevel = initValue(my.debuglevel, 3);  		// 0 - dont debug, 1 - error, 2 - error and warning, 3 - error, warning and info
	my.autoinit   = initValue(my.autoinit, true);		// Автоматически инициализировать Crypton
	
	my.worker 	 = undefined;
	my.keyActive = false;
	
	//-----------------------------------------------------
	// Вывод служебной информации
	my.log = function(type, msg, src) {
		if ((type=='error') && (my.debuglevel)) {
			msg = 'BlackCore Error: '+msg;
		}
		if ((type=='warning') && (my.debuglevel>1)) {
			msg = 'BlackCore Warning: '+msg;
		}
		if ((type=='info') && (my.debuglevel>2)) {
			msg = 'BlackCore Info: '+msg;
		}
		if (typeof(src) !== "undefined"){
			console.log(msg, src);
		}else{
			console.log(msg);
		}
	}
	
	//-----------------------------------------------------
	// Проверка активности Криптомодуля
	my.workerActive = function(){
		return (typeof(my.worker) !== "undefined");
	}
	
	//-----------------------------------------------------
	// Запуск криптомодуля
	my.workerStart = function() {
		try {
			//Подписываемся на события от worker
			my.subscribeToEvents();
			
			if(typeof(Worker) !== "undefined") {
				my.workerStop();
				my.worker = new Worker("js/app/crypton.js");
				
				// Обработчик ошибок Worker
				my.worker.addEventListener("error",
					function(e) {
						my.generateError('worker', 30, 'unknow', e); 
					},
					false);
				
				// Обработчик сообщений от Worker
				my.worker.addEventListener('message', function(e) {
						var message = e.data;
						switch (message.event) {
							case 'task':
								my.onTask(message.data);
								break;
							case 'error':
							case 'generate':
							case 'destroy':
								my.trigger(message.event, message.data);
								break;
							default:
								my.generateError('worker', 31, 'unknow event: '+message.event, message);
								break;
						}
					}, false);	
				my.trigger('start', my.worker);
				my.generateInfo('worker', 'start');
			} else {
				my.generateError('worker', 32, 'Browser not support Worker', e);
				my.workerStop();
			}
		} catch (e) {
			my.generateError('worker', 30, 'unknow', e);
			my.workerStop();
		}
	}
	
	//-----------------------------------------------------
	// Остановка криптомодуля	
	my.workerStop = function() {
		if(typeof(my.worker) != "undefined") {
			my.worker.terminate();
		}
		my.worker = undefined;
		my.trigger('stop');
		my.generateInfo('worker', 'stop');
	}
	
	
		
	my.subscribeToEvents = function(){
		my.generateInfo('events', 'Init ubscribe');
		
		my.on('start', function(msg){
			my.log('info', 'Start worker', msg);
		});
		
		my.on('stop', function(msg){
			my.log('info', 'Stop worker', msg);
		});
		
		my.on('info', function(msg){
			my.log('info', 'Module: '+msg.module+', message:'+msg.message, msg.source);
		});
		
		my.on('error', function(msg){
			my.log('error', 'Module: '+msg.module+', code:'+msg.code+', message:'+msg.message, msg.source);
		});
		
		my.on('generate', function(msg){
			my.log('info', 'generate', msg);
			my.keyActive = true;
		});
		
		my.on('destroy', function(msg){
			my.log('info', 'destroy', msg);
			my.keyActive = false;
		});
	}
	
	
	my.generateInfo = function (module, message, source) {
		my.trigger('info', {
			'module':	module, 
			'message': 	message,		
			'source':	source,
		});							
	}
	
	my.generateError = function (module, code, message, source) {
		my.trigger('error', {
			'module':	module, 
			'code': 	code,
			'message':	message,		
			'source':	source,
		});							
	}
	
	//-----------------------------------------------------------------------------//
	//
	//  				ОБРАБОТЧИК ПОДПИСОК СОБЫТИЙ
	//
	// События:
	//  error			- при ошибке в модуле BlackCore
	//  start			- при запуске модуля BlackCore	
	//  stop			- при остановке модуля BlackCore
	//  keygenerate		- при генерации ключа в модуле Crypton
	//  keydestroy		- при уничтожении ключа в модуле Crypton
	//  keyerror		- при ошибке в модуле Crypton
	//-----------------------------------------------------------------------------//
	my.on = function(eventName, handler) {
		if (!my._events) my._events = [];
		if (!my._events[eventName]) {
		  my._events[eventName] = [];
		}
		my._events[eventName].push(handler);
		//my.generateInfo('events', 'on '+eventName, handler);
	}

	/**
	*  Прекращение подписки
	*  menu.off('select',  handler)
	*/
	my.off = function(eventName, handler) {
		var handlers = my._events[eventName];
		if (!handlers) return;
		for(var i=0; i<handlers.length; i++) {
		  if (handlers[i] == handler) {
			handlers.splice(i--, 1);
			//my.generateInfo('events', 'off '+eventName, handler);
		  }
		}
	}

	/**
	* Генерация события с передачей данных
	*  my.trigger('select', item);
	*/
	my.trigger = function(eventName) {
		if (!my._events) my._events = [];
		if (!my._events[eventName]) {
		  return; // обработчиков для события нет
		}
	
		// вызвать обработчики
		var handlers = my._events[eventName];
		for (var i = 0; i < handlers.length; i++) {
		  handlers[i].apply(my, [].slice.call(arguments, 1));
		}
	}
	
	//-----------------------------------------------------------------------------//
	//
	//					 ЗАДАЧИ В КРИПТОМОДУЛЬ
	//
	//-----------------------------------------------------------------------------//

	//-----------------------------------------------------
	// Добавить запрос в очередь потока
	my.addTask = function(func, parameters, callback){
		if (!my._tasks) {
			my._tasks = {};
			my._tasksCount = 0;
		}
		if (my.workerActive){
			my._tasksCount++;
			my._tasks['tsk'+my._tasksCount] = callback;
			my.worker.postMessage({
					'function':		func,
					'parameters':	parameters,
					'callback':		my._tasksCount,
					'success':		undefined,
					'return':		undefined,
			});
			my.generateInfo('addTask', 'call '+func, {'func':func,'parameters':parameters,'callback':callback});
		} else {
			my.generateError('worker', 40, 'Worker not active!', func);
			if (typeof(callback) === 'function'){
				callback({
					'function':		func,
					'parameters':	parameters,
					'callback':		0,
					'success':		false,
					'return':		'Worker not active!',
				});
			}
		}
	}

	//-----------------------------------------------------
	// Обработать ответ от потока
	my.onTask = function(data){
		my.generateInfo('onTask', 'answer '+data.function, data);
		
		if (typeof(my._tasks['tsk'+data.callback]) === 'function'){
			my._tasks['tsk'+data.callback](data);
		}
		if (!data.success){
			my.generateError('worker', 41, 'onTask return error', data);
		}
		delete my._tasks['tsk'+data.callback];
	}

	//-----------------------------------------------------------------------------//
	//
	//               ВЗАИМОДЕЙСТВИЕ С КРИПТОМОДУЛЕМ
	//
	//-----------------------------------------------------------------------------//

	my.generateKey = function(pass, bits, callback) {
		my.addTask('generate', {pass:pass, bits:bits}, callback);
	}
	
	my.destroyKey = function(callback) {
		my.addTask('destroy', {}, callback);
	}
	
	my.publicKey = function(callback) {
		my.addTask('getPublicKey', '',callback);
	}

	my.publicKeyID = function(callback) {
		my.addTask('getPublicKeyID', '', callback);
	}

	my.keyID = function(key, callback) {
		my.addTask('calcKeyID', key, callback);
	}

	my.crypt = function(key, msg, callback) {
		my.addTask('crypt', {key:key, msg:msg}, callback);
	}

	my.decrypt = function(msg, callback) {
		my.addTask('decrypt', msg, callback);
	}	
	
	
	//-----------------------------------------------------------------------------//
	//
	//               		П О Л Ь З О В А Т Е Л И
	//
	//-----------------------------------------------------------------------------//
    my.publicKeyID = function(publicKey)
    {
        return SHA256(publicKey);
    }
	
	my.addUser = function(name, publickey){
		var pubKeyId = my.publicKeyID(publickey);
		if (!my._users) my._users = [];
		my._users[pubKeyId] = {
			id: pubKeyId,
			name: name || pubKeyId,
			publickey: publickey,
			messages: [],
		};
		my._users[pubKeyId].messages.push('Тестовое сообщение 1, для пользователя '+my._users[pubKeyId].name);
		my._users[pubKeyId].messages.push('Тестовое сообщение 2, для пользователя '+my._users[pubKeyId].name);
		my._users[pubKeyId].messages.push('Тестовое сообщение 3, для пользователя '+my._users[pubKeyId].name);
		my._users[pubKeyId].messages.push('Тестовое сообщение 4, для пользователя '+my._users[pubKeyId].name);
		my._users[pubKeyId].messages.push('Тестовое сообщение 5, для пользователя '+my._users[pubKeyId].name);
		return my._users[pubKeyId];
	}
	
	my.getUserByPK = function(publickey){
		return my.getUser(my.publicKeyID(publickey));
	}
	
	my.getUser = function(pubKeyId){
		return my._users[pubKeyId];
	}
	
	my.delUser = function(pubKeyId){
		if (!my._users) my._users = [];
		my._users.splice(pubKeyId, 1);
	}





	
	
	
	
	
	my.genPass = function(count) {
		var result       = '';
		var words        = '0123456789qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM';
		var max_position = words.length - 1;
		for( i = 0; i < count; ++i ) {
			position = Math.floor ( Math.random() * max_position );
			result = result + words.substring(position, position + 1);
		}
		return result;
	}



	/*
		status(3,"Начало шифрования");
		var Text = Base64.encode($("#SendMessage").val()+"<br><date>"+getDateTime()+"</date>");
		
		// Отправляем сообщение собеседнику
		var EncryptionResult = cryptico.encrypt(Text, YouPublicKey, RSAkey);
		SendMessage(YouPublicKeyId, EncryptionResult.cipher);
		
		$("#SendCryptMessage").val(EncryptionResult.cipher);
		
		// Отправляем копию себе
		var EncryptionResult = cryptico.encrypt(Text, MyPublicKey, RSAkey);
		SendMessage(MyPublicKeyId, EncryptionResult.cipher)
		
		status(4,"Конец шифрования");
	}		

	function decrypt() {
		status(6,"Начало дешифрования");
		$("#SendCryptMessage").val("");
		$("#SignatureText").val("");
		$("#VeryfeID").val("");
		var DecryptionResult = cryptico.decrypt($("#SendDeCryptMessage").val(), RSAkey);
		$("#SendDeMessage").val(Base64.decode(DecryptionResult.plaintext));
		$("#SignatureText").val(DecryptionResult.signature);
		$("#VeryfeID").val(cryptico.publicKeyID(DecryptionResult.publicKeyString));
		status(7,"Конец дешифрования");
	}
	*/

	//-----------------------------------------------------------------------------//
	//
	//                 Г Е Н Е Р А Ц И Я   К Л Ю Ч А
	//
	//-----------------------------------------------------------------------------//
    if (my.autoinit) {my.workerStart();}
	
	return my;

});