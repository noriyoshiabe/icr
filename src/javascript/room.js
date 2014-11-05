(function(definition) {
  Room = definition()
})(function() {
  'use strict'

  var Room = function Room(attributes) {
    Model.apply(this, arguments)

    this.users = new Users
    this.messages = new Messages
  }

  Room.USER_ADDED = 'room:user_added'

  _.extend(Room.prototype, Model.prototype, {
    properties: ['id', 'name', 'entered_at', 'updated_at'],

    enter: function(user) {
      this.user = user
      this.user.addObserver(this, this._onNotifyUserEvent)
      this.users.add(this.user)

      this.srv = new SignalingServer(this.user.id, location.origin.replace(/^http/, 'ws'))
      this.srv.addObserver(this, this._onNotifySignalingServerEvent)
      this.srv.connect(this.id)

      this.entered_at = new Date().getTime()
    },

    leave: function() {
      this.srv.disconnect()
      this.users.clear()
    },

    sendMessage: function(message) {
      var data = Message.create(this.id, this.user.id, message)
      _.each(this.users.models, function(u) {
        u.send('message', data)
      })
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
          break
        case User.AUTHENTICATE_FAILED:
          user.peer.close()
          user.removeObserver(this)
          break
        case User.MESSAGE:
          this.messages.add(data)
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
