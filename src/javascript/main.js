console.log('Hello!!')

window.addEventListener('load', function() {
  var user_id = uuid.v4()
  var srv = new SignalingServer(user_id, location.origin.replace(/^http/, 'ws'))

  srv.addObserver(function(ss, event, data) {
    window._s = ss
    console.log(event)
    if (event == SignalingServer.ON_CREATE_PEER) {
      var peer = data
      peer.addObserver(function(peer, event, data) {
        console.log(event)
        if (event == Peer.ON_CONNECTED) {
          window._p = peer
        } else if (event == Peer.ON_MESSAGE) {
          console.log(data)
        }
      })
    }
  })

  var room_id = location.hash.match(/^#.*/) ? location.hash.substring(1) : uuid.v4()
  location.hash = room_id
  srv.connect(room_id)
});
