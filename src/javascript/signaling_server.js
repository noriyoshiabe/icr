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

  SignalingServer.ON_CONNECTED = 'signaling_server:on_connected'
  SignalingServer.ON_DISCONNECTED = 'signaling_server:on_disconnected'
  SignalingServer.ON_CREATE_PEER = 'signaling_server:on_create_peer'
  SignalingServer.ON_REMOVE_PEER = 'signaling_server:on_remove_peer'

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
      this._socket.close()
    },

    send: function(peer, data) {
      var data = peer ? _.extend(data, {from: this.id, to: peer.id}) : _.extend(data, {from: this.id})
      this._socket.send(JSON.stringify(data))
    },

    _onWebSocketOpen: function(e) {
      this.send(null, {type: 'enter', room_id: this.room_id})
      this._notify(SignalingServer.ON_CONNECTED)
    },

    _onWebSocketMessage: function(e) {
      var message = JSON.parse(e.data)
      switch (message.type) {
      case 'enter':
        var peer = new Peer(message.from, this)
        peer.sendOffer()
        peer.addObserver(this, this._onNotifyPeerEvent)
        this.peers[message.from] = peer
        this._notify(SignalingServer.ON_CREATE_PEER, peer)
        break

      case 'offer':
        var peer = new Peer(message.from, this)
        peer.sendAnswer(message.description)
        peer.addObserver(this, this._onNotifyPeerEvent)
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
      this._notify(SignalingServer.ON_DISCONNECTED)
    },

    _onNotifyPeerEvent: function(peer, event, data) {
      if (Peer.ON_DISCONNECTED == event) {
        delete this.peers[peer.id]
        this._notify(SignalingServer.ON_REMOVE_PEER, peer)
      }
    }
  })

  return SignalingServer
});
