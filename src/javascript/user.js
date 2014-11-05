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
    properties: ['id', 'name', 'image_url'],

    send: function(type, data) {
      var message = {type: type, data: data}
      if (this.peer) {
        this.peer.send(JSON.stringify(message))
      } else {
        this._onMessage(message)
      }
    },

    _onNotifyPeerEvent: function(peer, event, message) {
      switch (event) {
        case Peer.ON_CONNECTED:
          // TODO verify, etc
          this._notify(User.AUTHENTICATE_SECCESS)
          break
        case Peer.ON_MESSAGE:
          this._onMessage(JSON.parse(message))
          break
      }
    },

    _onMessage: function(message) {
      switch (message.type) {
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
