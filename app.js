/*
 * configure an express app to serve our static resources out of the /public directory
 */

var express = require('express');
var app = express();
app.set('port', process.env.PORT || 3000);
app.use(express.static(__dirname+'/public'));

/*
 * bind our application to an http server listening on the application's configured port
 */

require('http').Server(app).listen(app.get('port'));
