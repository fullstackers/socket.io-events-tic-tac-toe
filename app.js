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
 * create the channel that our specators will be on
 */

var game = io.of('/');

/*
 * whenever we get a connection we will let everyone know one joined the room
 */

game.on('connection', function (sock) {

  /*
   * whenever we disconnect we will let everyone know this spectator left
   */

  sock.on('disconnect', function () {
    sock.broadcast.emit('spectator left', sock.id);
  });

  /*
   * let everyone know we a new spectator joined the game
   */

  game.emit('spectator joined', sock.id);

});

/*
 * attach the router to the socket.io app
 */

io.use(router);

/*
 * have the server listen on the app's configured port
 */

server.listen(app.get('port'));
