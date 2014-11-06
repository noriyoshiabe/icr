(function(definition) {
  User = definition()
})(function() {
  'use strict'

  var User = function User(attributes) {
    Model.apply(this, arguments)

    this.peers = []
    var peer = attributes.peer ? attributes.peer : new FakePeer()
    peer.addObserver(this, this._onNotifyPeerEvent)
    this.peers.push(peer)
  }

  User.AUTHENTICATE_SECCESS = 'user:authenticate_seccess'
  User.AUTHENTICATE_FAILED = 'user:authenticate_failed'
  User.MESSAGE = 'user:message'
  User.ON_MESSAGE = 'user:on_message'
  User.ON_DISCONNECTED = 'user:on_disconnected'

  _.extend(User.prototype, Model.prototype, {
    properties: ['id', 'name', 'image_url', 'signature'],

    send: function(type, data) {
      var message = {type: type, data: data}
      this.peers.forEach(function(peer) {
        peer.send(JSON.stringify(message))
      })
    },

    extend: function(user) {
      user.peers.forEach(function(peer) {
        peer.removeObserver(user)
        peer.addObserver(this, this._onNotifyPeerEvent)
        this.peers.push(peer)
      }.bind(this))
    },

    _onNotifyPeerEvent: function(peer, event, message) {
      switch (event) {
        case Peer.ON_CONNECTED:
          this.send('auth:request', app.cert.user_id)
          break

        case Peer.ON_DISCONNECTED:
          var index = this.peers.indexOf(peer)
          if (-1 < index) {
            this.peers.splice(index, 1)
            if (_.isEmpty(this.peers)) {
              this._notify(User.ON_DISCONNECTED)
            }
          }
          break

        case Peer.ON_MESSAGE:
          this._onMessage(peer, JSON.parse(message))
          break
      }
    },

    _onMessage: function(peer, message) {
      switch (message.type) {
        case 'auth:request':
          var remote_user_id = message.data
          var signature = CryptoJS.SHA1(remote_user_id + app.cert.secret).toString(CryptoJS.enc.Hex)
          this.send('auth:result', {user_id: app.cert.user_id, signature: signature})
          break

        case 'auth:result':
          var result = message.data
          this.id = result.user_id
          this.find(function(user) {
            this.set(user)
            if (this.signature) {
              if (this.signature == result.signature) {
                this._notify(User.AUTHENTICATE_SECCESS)
              } else {
                peer.removeObserver(this)
                peer.close()
                this._notify(User.AUTHENTICATE_FAILED)
              }
            } else {
              this.signature = result.signature
              this.save()
              this._notify(User.AUTHENTICATE_SECCESS)
            }
          }.bind(this))
          break

        case 'message':
          this._notify(User.MESSAGE, message.data)
          break
      }

      this._notify(User.ON_MESSAGE, message)
    },

    storeName: "users"
  })

  User.schemeDefinition = function(db) {
    db.createObjectStore("users", {keyPath: "id"})
  }

  return User
});

(function(definition) {
  Users = definition()
})(function() {
  'use strict'

  var Users = function Users(objects) {
    Collection.apply(this, objects)
  }

  _.extend(Users.prototype, Collection.prototype, {
    model: User
  })

  return Users
});

(function(definition) {
  FakePeer = definition()
})(function() {
  'use strict'

  var FakePeer = function FakePeer() {
    Observable.apply(this)
  }

  _.extend(FakePeer.prototype, Observable.prototype, {
    send: function(data) {
      this._notify(Peer.ON_MESSAGE, data)
    }
  })

  return FakePeer
});
