(function(definition) {
  User = definition()
})(function() {
  'use strict'

  var User = function User(attributes) {
    Model.apply(this, arguments)

    if (attributes.peer) {
      this.peer = attributes.peer
      this.peer.addObserver(this, this._onNotifyPeerEvent)
    }
  }

  User.AUTHENTICATE_SECCESS = 'user:authenticate_seccess'
  User.AUTHENTICATE_FAILED = 'user:authenticate_failed'
  User.MESSAGE = 'user:message'

  _.extend(User.prototype, Model.prototype, {
    properties: ['id', 'name', 'image_url', 'signature'],

    send: function(type, data) {
      var message = {type: type, data: data}
      if (this.peer) {
        this.peer.send(JSON.stringify(message))
      } else {
        this._onMessage(message)
      }
    },

    _onNotifyPeerEvent: function(peer, event, message) {
      console.log(event)
      switch (event) {
        case Peer.ON_CONNECTED:
          this.send('auth:request')
          break
        case Peer.ON_DISCONNECTED:
          break
        case Peer.ON_MESSAGE:
          this._onMessage(JSON.parse(message))
          break
      }
    },

    _onMessage: function(message) {
      switch (message.type) {
        case 'auth:request':
          var signature = CryptoJS.SHA1(this.peer.id + app.cert.secret).toString(CryptoJS.enc.Hex)
          this.send('auth:result', signature)
          break

        case 'auth:result':
          this.find(function(user) {
            this.set(user)
            if (this.signature) {
              if (this.signature == message.data) {
                this._notify(User.AUTHENTICATE_SECCESS)
              } else {
                this._notify(User.AUTHENTICATE_FAILED)
              }
            } else {
              this.signature = message.data
              this.save()
              this._notify(User.AUTHENTICATE_SECCESS)
            }
          }.bind(this))
          break

        case 'message':
          this._notify(User.MESSAGE, message.data)
          break
      }
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
