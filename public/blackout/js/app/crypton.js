/*
 *  Crypton version 0.1  -  Copyright 2014 D.B. Nechaev
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
 
 
//------------------------------------------------------------------------------
// Импорт криптографических библиотек
//importScripts("../../vendor/cryptico/jsbn.js");
//importScripts("../../vendor/cryptico/random.js");
//importScripts("../../vendor/cryptico/hash.js");
//importScripts("../../vendor/cryptico/rsa.js");
//importScripts("../../vendor/cryptico/aes.js");
//importScripts("../../vendor/cryptico/api.js");
//importScripts("../../vendor/cryptico/b64.js");

importScripts("../../vendor/cryptico/cryptico.min.js");

//------------------------------------------------------------------------------
// Глобальные переменные
var RSAkey 			= undefined;
var RSApublicKey	= undefined;
var RSApublicKeyID	= undefined;

//-----------------------------------------------------------------------------//
//
//				С Л У Ж Е Б Н Ы Е   Ф У Н К Ц И И  
//
//-----------------------------------------------------------------------------//

// Отправка ответов на запросы модулю Криптрон (событие ChanelTask)
function sendTaskMessage(data) {
	self.postMessage({
		'event': 'task',
		'data': data,
	});
}

// Ошибки генерируемые модулем Криптрон (канал ChanelError)
function sendErrorMessage(code, message, source) {
	self.postMessage({
		'event': 'error',
		'data': {
			'module': 	'crypton',
			'code': 	code,
			'message':	message,		
			'source':	source,
		}});
}

// Отправить факт создания ключа(канал ChanelGenerate)
function sendGenerateMessage() {
	self.postMessage({
		'event': 'generate',
		'data': {
			'publicKey': RSApublicKey,
			'publicKeyID': RSApublicKeyID,
		}
	});
}

// Отправить факт уничтожения ключа(канал ChanelDestroy)
function sendDestroyMessage() {
	self.postMessage({
		'event': 'destroy',
		'data': {
			'publicKey': RSApublicKey,
			'publicKeyID': RSApublicKeyID,
		}
	});
}

//-----------------------------------------------------------------
// Генерация ответа результата функции
function packAnswer(task, success, result, error) {
	task.success = success;
	task.return  = (success) ? result : error;
	if (!success){
		sendErrorMessage(13, 'error in function', task);
	}
	return task;
}

//------------------------------------------------------------------------------
// Обработчик входящих сообщений
// Request
// {
//		'function': 	function,
//		'parameters': 	parameters,
//		'callback': 	callback,
//		'success': 		undefined,
//		'return': 		undefined,
// }

self.addEventListener('message', function(e) {
	var task = e.data;
	if (typeof(task.function) !== 'undefined') {
		try {
			if (typeof(fn[task.function]) === 'function') {
				sendTaskMessage(fn[task.function](task));
			} else {
				sendErrorMessage(12, 'no function', task);					
			}
		} catch (e) {
			e.raw = task;
			sendErrorMessage(10, 'unknow', e);
		}
	} else {
			sendErrorMessage(11, 'function is not available', task);
	}
}, false);

//-----------------------------------------------------------------------------//
//
//				В Н У Т Р Е Н Н И Е   Ф У Н К Ц И И  
//
//-----------------------------------------------------------------------------//


// Проверка существования ключа
function active(){		
	return ((typeof(RSAkey) !== 'undefined') && (typeof(RSApublicKey) !== 'undefined') && (typeof(RSApublicKeyID) !== 'undefined'));
}

// Генерация ключа
function generateKey(pass,bits){
	try {
		RSAkey = cryptico.generateRSAKey(pass, bits);
		if(typeof(RSAkey) !== "undefined") {
			RSApublicKey = cryptico.publicKeyString(RSAkey);
			RSApublicKeyID = cryptico.publicKeyID(RSApublicKey);
			sendGenerateMessage();
		}
	} catch (e) {
		sendErrorMessage(20, 'unknow', e);
		destroyKey();
	}
}

// Уничтожение ключа
function destroyKey(){
	sendDestroyMessage();
	RSAkey 			= undefined;
	RSApublicKey 	= undefined;
	RSApublicKeyID	= undefined;
}


//-----------------------------------------------------------------------------//
//
//				З А Д А Ч И   Д О С Т У П Н Ы Е   И З   В Н Е 
//
//-----------------------------------------------------------------------------//

var fn = {}
//------------------------------------------------------------------------------
// Сгенерить ключи
// params - {pass, bits}
fn.generate = function(task){		
	generateKey(task.parameters.pass, task.parameters.bits);
	return packAnswer(task, active(), {
			'publicKey': RSApublicKey,
			'publicKeyID': RSApublicKeyID,
		});
}

//------------------------------------------------------------------------------
// Удалить ключ
fn.destroy = function(task){		
	destroyKey();
	return packAnswer(task, true, true);
}

//------------------------------------------------------------------------------
// Получить мой публичный ключ
fn.getPublicKey = function(task){		
	return packAnswer(task, active(), RSApublicKey, '');
}

//------------------------------------------------------------------------------
// Получить ID моего публичного ключа
fn.getPublicKeyID = function(task){		
	return packAnswer(task, active(), RSApublicKeyID, '');
}

//------------------------------------------------------------------------------
// Расчет ID ключа
// task.parameters - публичный ключ
fn.calcKeyID = function(task){
	return packAnswer(task, true, cryptico.publicKeyID(task.parameters), '');
}

//------------------------------------------------------------------------------
// Шифрование сообщения
// task.parameters - {key, message}
fn.crypt = function(task){
	if (typeof(task.parameters.key)==="undefined"){
		task.parameters.key = cryptico.publicKeyString(RSAkey);
	}
	return packAnswer(task, active(), cryptico.encrypt(task.parameters.message, task.parameters.key, RSAkey), '');
}		

//------------------------------------------------------------------------------
// Расшифровка сообщения
// task.parameters - зашифрованный текст
fn.decrypt = function(task){
	return packAnswer(task, active(), cryptico.decrypt(task.parameters, RSAkey), '');
}