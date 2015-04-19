var cfg	= require('./config');
var log = require('log')(cfg, module);

var path = require('path');
var public_path = path.normalize(path.join(__dirname,cfg.server.public));
	
var domain 		 = require('domain');
var serverDomain = domain.create();
var server;

//----------------------------------------------------------------------------
// Server error
serverDomain.on('error', function(err){
   log.error("serverDomain: ",err);
   if (server) server.close();

   setTimeout(function(){
    process.exit(1);
   },200).unref();
});

//----------------------------------------------------------------------------
// Server run
serverDomain.run(function(){
	var express = require('express');
	var app 	= express();

	app.set('title', 'Amnesia');
	app.disable('x-powered-by');

	app.use(require('express-domain-middleware'));
	app.use('/api/v1', require('api_v1'));
	app.use(express.static(public_path));
 
	app.use(function(err, req, res, next){
		log.error("Express: "+err.message);
		res.status(500).send(err.message);
	});
	
	if (cfg.server.secure){
        var https   = require('https');
        var fs      = require("fs");
        https_options = {
            key:  fs.readFileSync(cfg.server.key),
            cert: fs.readFileSync(cfg.server.cert)
        };
        server = https.createServer(https_options, app);
    } else {
        var http = require('http');
        server   = http.createServer(app);
    }	
	server.listen(cfg.server.port, cfg.server.bind);

	log.info('Server run on '+cfg.server.bind+':'+cfg.server.port+' (secure: '+cfg.server.secure+')');
});