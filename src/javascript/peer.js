(function(definition) {
  Peer = definition()
})(function() {
  'use strict'

  var Peer = function Peer(id, signalingServer) {
    Observable.apply(this)

    this.id = id
    this.signalingServer = signalingServer

    this._peer = new webkitRTCPeerConnection({iceServers: [{'url': 'stun:stun.l.google.com:19302'}]}, {optional: []})
    this._peer.onicecandidate = this._onIceCandidate.bind(this)
    this._peer.oniceconnectionstatechange = this._onIceConnectionStateChange.bind(this)
    this._peer.ondatachannel = this._setDataChannel.bind(this)
  }

  Peer.ON_CONNECTED = "peer:on_connected"
  Peer.ON_DISCONNECTED = "peer:on_disconnected"
  Peer.ON_MESSAGE = "peer:on_message"

  _.extend(Peer.prototype, Observable.prototype, {
    sendOffer: function() {
      this._setDataChannel(this._peer.createDataChannel('RTCDataChannel'))

      this._peer.createOffer(function (description) {
        this._peer.setLocalDescription(description, function() {
          this.signalingServer.send(this, {type: 'offer', description: description})
        }.bind(this), this._onFailure)
      }.bind(this), this._onFailure)
    },

    sendAnswer: function(offer) {
      var description = new RTCSessionDescription(offer)
      this._peer.setRemoteDescription(description, function() {
        this._peer.createAnswer(function(answer) {
          this._peer.setLocalDescription(answer, function() {
            this.signalingServer.send(this, {type: 'answer', description: answer})
          }.bind(this), this._onFailure)
        }.bind(this), this._onFailure)
      }.bind(this), this._onFailure)
    },

    close: function() {
      if (this._peer.iceConnectionState != "closed") {
        this._peer.close()
      }
    },

    send: function(data) {
      if (this.dataChannel.readyState == "open") {
        this.dataChannel.send(data)
      }
    },

    onReceiveSignalingServerMessage: function(message) {
      switch (message.type) {
      case 'answer':
        var description = new RTCSessionDescription(message.description)
        this._peer.setRemoteDescription(description)
        break

      case 'candidate':
        var candidate = new RTCIceCandidate(message.candidate)
        this._peer.addIceCandidate(candidate)
        break
      }
    },

    _setDataChannel: function(channel) {
      var dataChannel = channel instanceof Event ? channel.channel : channel

      dataChannel.onopen = function(e) {
        if (dataChannel.readyState == "open") {
          this._notify(Peer.ON_CONNECTED)
        }
      }.bind(this)

      dataChannel.onmessage = function(e) {
        this._notify(Peer.ON_MESSAGE, e.data)
      }.bind(this)

      dataChannel.onclose = function(e) {
        this.close()
        this._notify(Peer.ON_DISCONNECTED)
      }.bind(this)

      dataChannel.onerror = this._onError

      this.dataChannel = dataChannel
    },

    _onIceCandidate: function(e) {
      if (e.candidate) { // null が来る場合あり
        this._peer.addIceCandidate(e.candidate)
        this.signalingServer.send(this, {type: 'candidate', candidate: e.candidate})
      }
    },

    _onIceConnectionStateChange: function(e) {
      if (this._peer.iceConnectionState == "disconnected") {
        this._notify(Peer.ON_DISCONNECTED)
      }
    },

    _onFailure: function(e) {
      console.log(e)
    },

    _onError: function(e) {
      console.log(e)
    }
  })

  return Peer
});
