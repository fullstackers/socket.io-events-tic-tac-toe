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

    socket.on('when spectator wants to play as team', function(data) {
        $('.'+data).find('h5')[0].innerHTML = "Player: "+data;
        $('.'+data).find('button').addClass('hide');
    });

    socket.on('player selects tile', function(data) {
        //$('#'+data.tile)

    });

    $(document).ready(function() {
        $('.team').find('button').click(function(e) {
            console.log('when spectator wants to play as team', e.target.value);
            socket.emit('when spectator wants to play as team', e.target.value);
        });

        $('.tile').click(function(e) {
            console.log('player selects tile', e.target.id);
            socket.emit('player selects tile', e.target.id);
        });
    });
})();
