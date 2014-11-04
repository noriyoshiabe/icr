(function(definition) {
  Room = definition()
})(function() {
  'use strict'

  var Room = function Room(attributes) {
    Model.apply(this, arguments)

    this.users = new Users
  }

  Room.USER_ADDED = 'room:user_added'

  _.extend(Room.prototype, Model.prototype, {
    properties: ['id', 'name', 'entered_at', 'updated_at'],

    enter: function(user_id) {
      this.srv = new SignalingServer(user_id, location.origin.replace(/^http/, 'ws'))
      this.srv.addObserver(this, this._onNotifySignalingServerEvent)
      this.srv.connect(this.id)
    },

    leave: function() {
      this.srv.disconnect()
      this.users.clear()
    },

    _onNotifySignalingServerEvent: function(srv, event, data) {
      if (SignalingServer.ON_CREATE_PEER == event) {
        var peer = data
        var user = new User({id: peer.id, peer: peer})
        user.addObserver(this, this._onNotifyUserEvent)
      }
    },

    _onNotifyUserEvent: function(user, event, data) {
      switch (event) {
        case User.AUTHENTICATE_SECCESS:
          this.users.add(user)
          this._notify(Room.USER_ADDED, user)
          user.removeObserver(this)
          break
        case User.AUTHENTICATE_FAILED:
          user.peer.close()
          user.removeObserver(this)
          break
      }
    }
  })

  return Room
});

(function(definition) {
  Rooms = definition()
})(function() {
  'use strict'

  var Rooms = function Rooms(objects) {
    Collection.apply(this, objects)
  }

  _.extend(Rooms.prototype, Collection.prototype, {
    model: Room,
  })

  return Rooms
});
