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
      this.save()
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
      switch (event) {
        case SignalingServer.ON_CREATE_PEER:
          var peer = data
          var user = new User({id: peer.id, peer: peer})
          user.addObserver(this, this._onNotifyUserEvent)
          break
        case SignalingServer.ON_REMOVE_PEER:
          var peer = data
          this.users.removeWhere({id: peer.id})
          break
      }
    },

    _onNotifyUserEvent: function(user, event, data) {
      switch (event) {
        case User.AUTHENTICATE_SECCESS:
          this.users.add(user)
          this._notify(Room.USER_ADDED, user)
          this.users.save()
          break
        case User.AUTHENTICATE_FAILED:
          user.peer.close()
          user.removeObserver(this)
          break
        case User.MESSAGE:
          var message = new Message(data)
          this.messages.add(message)
          message.save()
          break
      }
    },

    storeName: "rooms"
  })

  Room.schemeDefinition = function(db) {
    db.createObjectStore("rooms", {keyPath: "id"})
  }

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
