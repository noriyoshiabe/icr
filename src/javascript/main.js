console.log('Hello!!')

window.addEventListener('load', function() {
  var user_id = uuid.v4()
  var srv = new SignalingServer(user_id, location.origin.replace(/^http/, 'ws'))

  srv.addObserver(function(ss, event) {
    console.log(event)
    if (event.type == SignalingServer.ON_CREATE_PEER) {
      var peer = event.data
      peer.addObserver(function(peer, event) {
        console.log(event)
        if (event.type == Peer.ON_CONNECTED) {
          window._p = peer
        }
      })
    }
  })

  var room_id = location.hash.match(/^#.*/) ? location.hash.substring(1) : uuid.v4()
  location.hash = room_id
  srv.connect(room_id)
});
