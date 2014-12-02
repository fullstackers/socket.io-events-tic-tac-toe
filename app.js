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
 * create our socket.io instance
 */

var io = require('socket.io')(server)

/*
 * The game data
 */

var game = { team: { x: null, o: null } };

/*
 * create the router for the game, this is where our game logic lives
 */

var router = require('socket.io-events')();

router.on(function (sock, args, next) {
  console.log('sock', sock.id, 'args', args);
  next();
});

/*
router.on('connection', function (sock, args, next) {
  io.emit('spectator joined', sock.id);
  sock.on('disconnect', function () {
    sock.broadcast('spectator left', sock.id);
  });
});
*/

// TODO 'spectator wants to play as team' will get converted to /spectator wants to play as team/
// instead of /^spectator wants to play as team$/ NOTE possible major version bump
router.on('spectator wants to play as team', function (sock, args) {
  var team = args.pop();

  /*
   * and the team is not a valid team
   */
  if (!(team in game.team)) {
    
    /*
     * then team does not exist
     */

    return sock.emit('team does not exist', team);

  }

  /*
   * and the team is already taken
   */

  if (game.team[team]) {
    
    /*
     * then the spectator can't play as team
     */

    return sock.emit('spectator can\'t play as team', team);

  }

  /* 
   * Then store that spectator as the player for the team
   */

  game.team[team] = sock.id;

  /*
   * And tell the specator we are playing as the team
   */

  // TODO we need to be able to reference the value on that socket without going to sock.sock
  sock.sock.playing.team = team;

  /*
   * And tell the spectators the player is playing as the given team
   */

  io.emit('spectator is playing as team', sock.id, team);

});

/*
 * attach the events router to the game
 */

io.use(router);

/*
 * whenever we get a connection we will let everyone know one joined the room
 */

io.on('connection', function (sock) {


  sock.playing = { team: null };

  /*
   * whenever we disconnect we will let everyone know this spectator left
   */

  sock.on('disconnect', function () {

    /*
     * then tell the other specators this spectator has left
     */

    sock.broadcast.emit('spectator left', sock.id);

    /*
     * and we are playing on a team
     */

    if (sock.playing.team) {

      /*
       * then clear the player from the team
       */

      game.team[sock.playing.team] = null; 

      /*
       * and clear the flag that tells the player is playing the team
       */

      sock.playing.team = null;

      /*
       * and tell the other players no one is playing on that team
       */

      sock.broadcast.emit('no one is playing for team', sock.playing.team);

    }

  });

  /*
   * let everyone know we a new spectator joined the game
   */

  io.emit('spectator joined', sock.id);

});

/*
 * have the server listen on the app's configured port
 */

server.listen(app.get('port'));
