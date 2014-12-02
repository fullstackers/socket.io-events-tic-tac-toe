(function() {

    var socket = io();

    socket.on('connect', function() {
        console.log('connected!');
    });

    socket.on('spectator-join', function(data) {
        $('event-log').append('<li>'+data+'</li>');
    });

    socket.on('player-join-team', function(data) {
        //$('#'+data.team).find('.
    });
})();
