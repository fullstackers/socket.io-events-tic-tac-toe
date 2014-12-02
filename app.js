/*
 * configure an express app to serve our static resources out of the /public directory
 */

var express = require('express');
var app = express();
app.set('port', process.env.PORT || 3000);
app.use(express.static(__dirname+'/public'));

/*
 * bind our application to an http server 
 */

var server = require('http').Server(app);

/*
 * create the router for the game, this is where our game logic lives
 */

var router = require('socket.io-events')();

/*
 * create our socket.io instance
 */

var io = require('socket.io')(server)

/*
 * whenever we get a connection we will let everyone know one joined the room
 */

io.on('connection', function (sock) {
  io.emit('spectator joined', sock.id);
});

/*
 * whenever we loose a connection we will let everyone know one left the room
 */

io.on('disconect', function (sock) {
  io.emit('specator left', sock.id);
});

/*
 * attach the router to the socket.io app
 */

io.use(router);

/*
 * Use sticky-session, which will help us out with our process clustering, to have the server start
 * listening on the applications configured port.
 */

require('sticky-session')(server).listen(app.get('port'));
