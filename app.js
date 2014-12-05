var debug = require('debug')('app');
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
  },
  current_team_turn: 'x'
};

game.cells = function () {
  return [ this.tiles['top-left'], this.tiles['top-middle'], this.tiles['top-right'],
          this.tiles['middle-left'], this.tiles['middle'], this.tiles['middle-right'],
          this.tiles['bottom-left'], this.tiles['bottom-middle'], this.tiles['bottom-right']];
};

game.tick = function () {
  this.switchTeams();
  return this;
};

game.switchTeams = function () {
  this.current_team_turn = this.current_team_turn === 'x' ? 'o' : 'x';
  return this;
};

game.clear = function () {
  for (var k in this.tiles) this.tiles[k] = null;
  return this;
};

game.reset = function () {
  this.clear().switchTeams().tick();
  return this;
};

game.winStates = function () {

  if (!this.winStates.states) {

    var cells = this.cells();

    var states = [];

    for (var i=0; i<3; i++) {
      var vertical = [], horizontal = [];
      for (var j=0; j<3; j++) {
        vertical.push(i + j * 3);
        horizontal.push(i * 3 + j);
      }
      states.push(horizontal);
      states.push(vertical);
    }

    var down = [], up = [];
    for (var j=0; j<3; j++) {
      down.push((j * 3) + j);
      up.push((-j * 3) + j + 6);
    }
    states.push(down);
    states.push(up);

    this.winStates.states = states;
  }

  return this.winStates.states;

};

debug('winStates', game.winStates());

/*
 * create the router for the game, this is where our game logic lives
 */

var router = require('socket.io-events')();

router.on(function (sock, args, next) {
  debug('sock', sock.id, 'args', args);
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
  // (a socket.io-events enhancement)
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
   * and the spectator is playing a team
   */

  if (!sock.sock.playing.team || game.team[sock.sock.playing.team] !== sock.id) {

    /*
     * then tell the specatator they can't make that move
     */

    return sock.emit('spectator can\'t select tile if not playing', tile);

  }

  /*
   * and it is the specator's team current turn
   */

  debug('current team turn %s, playing team %s', game.current_team_turn, sock.sock.playing.team);

  if (game.current_team_turn !== sock.sock.playing.team) {

    /*
     * then tell the specator they can't play out of turn
     */

    return sock.emit('specator\'s team is out of turn');

  }


  /*
   * and the tile is a valid tile and is not currenlty selected
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

  io.emit('spectator on team chose tile', sock.id, sock.sock.playing.team, tile);

  /*
   * and calcuate any winners
   */
  var cells = game.cells();
  debug('cells init', cells);

  
  var winStates = game.winStates();
  debug('winStates', winStates);

  var wonStates = [];
  for (var i=0; i<winStates.length; i++) {
    var winState = winStates[i]
    var xwin = 0, owin = 0, team = null;
    for (var j=0; j<winState.length; j++) {
      debug('i %s, j %s %s', i, j, winState[j])
      if (cells[winState[j]] === 'x') {
        xwin++;
      }
      else if (cells[winState[j]] === 'o') {
        owin++;
      }
    }

    debug('xwin', xwin, 'owin', owin);
    if (xwin === 3) team = 'x';
    else if (owin ===3) team = 'o';

    debug('team', team);
    if (team) wonStates.push({team: team, selection: winState});
  }

  debug('wonStates', wonStates);

  if (wonStates.length) {

    var selections = [], team = null;

    for (var i=0; i<wonStates.length; i++) {
      var wonState = wonStates[i];
      debug('wonState', wonState);
      if (!team) team = wonState.team;
      selections.push(wonState.selection);
    }

    io.emit('team won', team, selections);

    game.reset();
  }
  else {

    /*
     * and calculate a draw
     */

    var played = 0;
    for (var i=0; i<cells.length; i++) {
      if (cells[i] != null) {
        played++;
      }
    }

    var draw = (played == cells.length);
    if (draw) {
      io.emit('draw game');
      game.reset();
    }
    else game.tick();
  }

  /*
   * and tell the sockets of the current teams turn
   */

  io.emit('current team turn', game.current_team_turn, game.team[game.current_team_turn]);

  /*
   * and tell the current game state
   */
  
  io.emit('current game state', game);

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
   * let the sock who they are
   */

  io.emit('you are', sock.id);

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
