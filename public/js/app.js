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

    socket.on('connect', function(gameState) {
        console.log('connected!');
        setTeam('x', gameState.team.x);
        setTeam('y', gameState.team.y);
    });

    socket.on('spectator joined', function(spectator) {
        $('#event-log').prepend('<li>Specator <em>'+spectator+'</em> joined</li>');
    });

    socket.on('spectator left', function(spectator) {
        $('#event-log').append('<li>Specator <em>'+spectator+'</em> left</li>');
    });

    socket.on('spectator can\'t play as team', function(team) {
        console.log('you can\'t play as team', team);
        $('#event-log').prepend('<li>There is already a player for team <em>'+team+'</em></li>');
    });

    socket.on('spectator is playing as team', function(spectator, team) {
        console.log('spectator is playing as team', team);
        setTeam(spectator, team);
    });

    socket.on('no one is playing for team', function(team) {
        setTeam(null, team);
        $('.team-'+team).find('h5').html("Seat Empty");
        $('.team-'+team).find('button').removeClass('hide');
    });

    socket.on('player selects tile', function(team, tile) {
        $('#'+tile).html(team);
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
