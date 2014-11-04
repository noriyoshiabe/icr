console.log('Hello!!')

window.addEventListener('load', function() {
  var user_id = uuid.v4()
  var room_id = location.hash.match(/^#.*/) ? location.hash.substring(1) : uuid.v4()

  var room = new Room({id: room_id})
  room.addObserver(this, function(room, event, data) {
    if (Room.USER_ADDED == event) {
      var peer = data.peer
      peer.addObserver(this, function(peer, event, data) {
        if (event == Peer.ON_MESSAGE) {
          console.log(data)
        }
      })

      window._p = peer
    }
  })

  room.enter(user_id)

  location.hash = room_id
});
