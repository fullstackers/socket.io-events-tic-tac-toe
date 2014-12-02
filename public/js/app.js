(function() {

    var socket = io();

    socket.on('connect', function() {
        console.log('connected!');
    });

    socket.on('spectator joined', function(spectator) {
      $('#event-log').append('<li>Specator <em>'+spectator+'</em> joined</li>');
    });

    socket.on('spectator left', function(spectator) {
      $('#event-log').append('<li>Specator <em>'+spectator+'</em> left</li>');
    });

    socket.on('player-join-team', function(data) {
        //$('#'+data.team).find('.
    });
})();
