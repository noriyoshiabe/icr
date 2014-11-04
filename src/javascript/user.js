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

  _.extend(User.prototype, Model.prototype, {
    properties: ['id', 'name', 'image_url'],

    _onNotifyPeerEvent: function(peer, event, data) {
      if (Peer.ON_CONNECTED == event) {
        // TODO verify, etc
        this._notify(User.AUTHENTICATE_SECCESS)
      }
    }
  })

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
