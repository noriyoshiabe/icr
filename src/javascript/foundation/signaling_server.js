(function(definition) {
  SignalingServer = definition()
})(function() {
  'use strict'

  var IDLE_COMMUNICATION_INTERVAL = 1000

  var SignalingServer = function SignalingServer(severUrl) {
    Observable.apply(this)

    this.id = uuid.v4()
    this.severUrl = severUrl
    this.peers = {}
  }

  SignalingServer.ON_CONNECTED = 'signaling_server:on_connected'
  SignalingServer.ON_DISCONNECTED = 'signaling_server:on_disconnected'
  SignalingServer.ON_CREATE_PEER = 'signaling_server:on_create_peer'
  SignalingServer.ON_REMOVE_PEER = 'signaling_server:on_remove_peer'
  SignalingServer.IDLE_COMMUNICATION = 'signaling_server:idle_communication'

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

      if (this._idle) {
        clearInterval(this._idle)
      }
    },

    send: function(peer, data) {
      var data = peer ? _.extend(data, {from: this.id, to: peer.id}) : _.extend(data, {from: this.id})
      this._socket.send(JSON.stringify(data))
    },

    _onWebSocketOpen: function(e) {
      this.send(null, {type: 'enter', room_id: this.room_id})
      this._notify(SignalingServer.ON_CONNECTED)
      this._idle = setInterval(this._idlePing.bind(this), IDLE_COMMUNICATION_INTERVAL)
      this._idleCount = 0
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

      case 'pong':
        --this._idleCount
        break;
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
      this._notify(SignalingServer.ON_DISCONNECTED)

      if (this._idle) {
        clearInterval(this._idle)
      }
    },

    _onNotifyPeerEvent: function(peer, event, data) {
      if (Peer.ON_DISCONNECTED == event) {
        delete this.peers[peer.id]
        this._notify(SignalingServer.ON_REMOVE_PEER, peer)
      }
    },

    _idlePing: function() {
      if (5 < this._idleCount) {
        this.disconnect()
        this._notify(SignalingServer.ON_DISCONNECTED)
      } else {
        this.send(null, {type: 'ping'})
        this._notify(SignalingServer.IDLE_COMMUNICATION, this._idleCount, IDLE_COMMUNICATION_INTERVAL)
        ++this._idleCount
      }
    }
  })

  return SignalingServer
});
