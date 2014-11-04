(function(definition) {
  SignalingServer = definition()
})(function() {
  'use strict'

  var SignalingServer = function SignalingServer(id, severUrl) {
    Observable.apply(this)

    this.id = id
    this.severUrl = severUrl
    this.peers = {}
  }

  SignalingServer.ON_RECIVE_MESSAGE = 'signaling_server:on_receive_message'
  SignalingServer.ON_CREATE_PEER = 'signaling_server:on_create_peer'

  _.extend(SignalingServer.prototype, Observable.prototype, {
    connect: function(room_id) {
      this.room_id = room_id

      this._socket = new WebSocket(this.severUrl)
      this._socket.onopen = this._onWebSocketOpen.bind(this)
      this._socket.onmessage = this._onWebSocketMessage.bind(this)
      this._socket.onerror = this._onWebSocketError.bind(this)
      this._socket.onclose = this._onWebSocketClose.bind(this)
    },

    disconnect: function() {
      for (var key in this.peers) {
        this.peers[key].close()
      }
    },

    send: function(peer, data) {
      var data = peer ? _.extend(data, {from: this.id, to: peer.id}) : _.extend(data, {from: this.id})
      this._socket.send(JSON.stringify(data))
    },

    _onWebSocketOpen: function(e) {
      this.send(null, {type: 'enter', room_id: this.room_id})
    },

    _onWebSocketMessage: function(e) {
      var message = JSON.parse(e.data)
      switch (message.type) {
      case 'enter':
        var peer = new Peer(message.from, this)
        peer.sendOffer()
        this.peers[message.from] = peer
        this._notify(SignalingServer.ON_CREATE_PEER, peer)
        break

      case 'offer':
        var peer = new Peer(message.from, this)
        peer.sendAnswer(message.description)
        this.peers[message.from] = peer
        this._notify(SignalingServer.ON_CREATE_PEER, peer)
        break
      }

      var peer = this.peers[message.from]
      if (peer) {
        peer.onReceiveSignalingServerMessage(message)
      }
    },

    _onWebSocketError: function(e) {
      console.log(e)
    },

    _onWebSocketClose: function(e) {
      console.log(e)
    }
  })

  return SignalingServer
});
