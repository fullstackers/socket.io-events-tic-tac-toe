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

var game = { 
  team: { 
    x: null, o: null 
  },
  tiles: {
    'top-left': null, 'top-middle': null, 'top-right': null,
    'middle-left': null, 'middle': null, 'middle-right': null,
    'bottom-left': null, 'bottom-middle': null, 'bottom-right': null
  }
};

/*
 * create the router for the game, this is where our game logic lives
 */

var router = require('socket.io-events')();

router.on(function (sock, args, next) {
  console.log('sock', sock.id, 'args', args);
  next();
});

/*
// TODO "connection" and "disconnect" events are not being captured by the router.  We may need to
// wrap the router and expose it in another object that extends socket.io
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
  
  /*
   * given the team
   */

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
   * and the player isn't already playing for a team
   */

  console.log('sock.sock.playing.team', sock.sock.playing.team);

  if (sock.sock.playing.team) {

    /*
     * then we can't play as both teams
     */

    return sock.emit('spectator already playing for team', sock.sock.playing.team);

  }

  /*
   * and the team is already taken
   */

  if (game.team[team]) {


    /*
     * and the the player is already on the team
     */

    if (game.team[team] === sock.id) {

      /*
       * then the socket is already playing the game
       */

      return sock.emit('spectator already playing on team', x);

    }
    
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
 * when a player selects a game tile
 */

router.on('player selects tile', function (sock, args, next) {

  /*
   * given the tile
   */

  var tile = args.pop();

  /*
   * and the spectator is not the player
   */

  if (!sock.sock.playing.team || game.team[sock.sock.playing.team] !== sock.id) {

    /*
     * then tell the specatator they can't make that move
     */

    return sock.emit('spectator can\'t select tile if not playing', tile);

  }

  /*
   * and the tile is not valid
   */

  if (!(tile in game.tiles) || game.tiles[tile] !== null) {

    /*
     * then tell the spectator that is an invalid tile
     */

    return sock.emit('spectactor selected an invalid tile', tile);

  }

  /*
   * then update tile with the appropriate team's mark
   */

  game.tiles[tile] = sock.sock.playing.team;

  /*
   * and tell the sockets the spectator playing the team chose the tile
   */

  io.emit('specator on team chose tile', sock.id, sock.sock.playing.team, tile);

  // TODO check if the game is over, win/draw

  next();

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
       * and tell the other players no one is playing on that team
       */

      sock.broadcast.emit('no one is playing for team', sock.playing.team);

      /*
       * and clear the flag that tells the player is playing the team
       */

      sock.playing.team = null;

    }

  });

  /*
   * let everyone know we a new spectator joined the game
   */

  io.emit('spectator joined', sock.id);

  /*
   * give the current state of the game
   */

  sock.emit('current game state', game);

});

/*
 * have the server listen on the app's configured port
 */

server.listen(app.get('port'));
