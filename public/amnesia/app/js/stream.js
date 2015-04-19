importScripts("../vendor/cryptico/cryptico.min.js");	
onmessage = function(ev) {
	var key = cryptico.generateRSAKey(ev.data.pass, ev.data.bits);
	var ans = {};
	var bits = 16;
	ans.n = key.n.toString(bits);
	ans.e = key.e.toString(bits);
	ans.d = key.d.toString(bits);
	ans.p = key.p.toString(bits);
	ans.q = key.q.toString(bits);
	ans.dmp1 = key.dmp1.toString(bits);
	ans.dmq1 = key.dmq1.toString(bits);
	ans.coeff = key.coeff.toString(bits);
	postMessage(ans);
};