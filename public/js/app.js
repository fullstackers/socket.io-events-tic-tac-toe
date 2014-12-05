(function() {

    var socket = io();

    function setTeam(spectator, team) {

        if(spectator) {
            $('.team-'+team).find('h5').html("Player: "+spectator);
            $('.team-'+team).find('button').addClass('hide');
        } else {
            $('.team-'+team).find('h5').html("Seat Empty");
            $('.team-'+team).find('button').removeClass('hide');
        }
    }

    function showAlert(msg) {
        $('#alert-modal').html(msg).removeClass('hide');

        setTimeout(hideAlert, 5000);
    }

    function hideAlert() {
        $('#alert-modal').addClass('hide');
    }

    function logEvent(msg) {
        $('#event-log').prepend('<li>', msg);
    }

    function nextTurn(team) {
        $('.team').removeClass('your-turn');
        $('.team-'+team).addClass('your-turn');
    }

    socket.on('current game state', function(gameState) {
        console.log('connected!', gameState);
        $('.tile').each(function () { $(this).html(''); });
        setTeam(gameState.team.x, 'x');
        setTeam(gameState.team.o, 'o');
        nextTurn(gameState.current_team_turn);

        for(var i in gameState.tiles) {
            if(gameState.tiles.hasOwnProperty(i) && gameState.tiles[i]) {
                 $('#'+i).html(gameState.tiles[i]);
            }
        }
    });

    socket.on('spectator joined', function(spectator) {
        logEvent('Spectator '+spectator+' joined');
    });

    socket.on('spectator left', function(spectator) {
        logEvent('Spectator '+spectator+' left');
    });

    socket.on('spectator can\'t play as team', function(team) {
        logEvent('There is already a player for team '+team);
    });

    socket.on('spectator is playing as team', function(spectator, team) {
        setTeam(spectator, team);
    });

    socket.on('no one is playing for team', function(team) {
        setTeam(null, team);
        $('.team-'+team).find('h5').html("Seat Empty");
        $('.team-'+team).find('button').removeClass('hide');
    });

    socket.on('spectator on team chose tile', function(spectator, team, tile) {
        $('#'+tile).html(team);
    });

    socket.on('spectator already playing for team', function (team) {
      console.log('you are already playing on team %s', team);
    });

    socket.on('specator\'s team is out of turn', function () {
      console.log('out of turn');
    });

    socket.on('team won', function (team) {
      logEvent('Winner!  Team '+team+' has won the game!');
      showAlert('Team '+team+' has won!');
    });

    socket.on('draw game', function () {
      logEvent('The game has ended in a draw');
      showAlert('Draw!');
    });

    socket.on('current team turn', function (team) {
        nextTurn(team);
    });

    $(document).ready(function() {
        $('.team').find('button').click(function(e) {
            console.log('spectator wants to play as team', e.target.value);
            socket.emit('spectator wants to play as team', e.target.value);
        });

        $('.tile').click(function(e) {
            console.log('player selects tile', e.target.id);
            socket.emit('player selects tile', e.target.id);
        });
    });
})();
