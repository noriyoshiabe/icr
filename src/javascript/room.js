(function(definition) {
  Room = definition()
})(function() {
  'use strict'

  var LIMIT = 50

  var Room = function Room(attributes) {
    Model.apply(this, arguments)

    this.users = new Users
    this.messages = new Messages
  }

  Room.USER_ADDED = 'room:user_added'

  _.extend(Room.prototype, Model.prototype, {
    properties: ['id', 'name', 'named_at', 'entered_at'],

    enter: function(user) {
      this.user = user
      this.user.addObserver(this, this._onNotifyUserEvent)
      this.users.add(this.user)

      this._readMessage()
    },

    _readMessage: function() {
      var query = {index: "room_id_and_created_at", lower: [this.id], upper:[this.id, ''], last: LIMIT}
      this.messages.select(query, function(messages) {
        this._connectServer()
      }.bind(this))
    },

    _connectServer: function() {
      this.srv = new SignalingServer(this.user.id, location.origin.replace(/^http/, 'ws'))
      this.srv.addObserver(this, this._onNotifySignalingServerEvent)
      this.srv.connect(this.id)
    },

    _finishEnter: function() {
      this.entered_at = new Date().getTime()
      this.save()
    },

    leave: function() {
      this.srv.disconnect()
      this.users.clear()
      this.messages.clear()
    },

    sendMessage: function(message) {
      var data = Message.create(this.id, this.user.id, message)
      _.each(this.users.models, function(u) {
        u.send('message', data)
      })
    },

    _onNotifySignalingServerEvent: function(srv, event, data) {
      switch (event) {
        case SignalingServer.ON_CONNECTED:
          this._finishEnter()
          break
        case SignalingServer.ON_DISCONNECTED:
          // TODO
          break
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
          this._startSync(user)
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
        case User.ON_MESSAGE:
          this._onMessage(user, data)
          break
      }
    },

    _startSync: function(user) {
      this.synchronizingQ = this.synchronizingQ || []

      if (this.synchronizing) {
        this.synchronizingQ.push(user)
      } else {
        this.synchronizing = user
        this._sync(user)
      }
    },

    _sync: function(user) {
      var syncQuery = {}
      
      var last = _.last(this.messages.models)
      var ids = _.pluck(_.last(this.messages.models, LIMIT), 'id')
      syncQuery.newest = last ? last.created_at : new Date().getTime()
      syncQuery.limit = LIMIT
      syncQuery.hash = CryptoJS.SHA1(ids.join('')).toString(CryptoJS.enc.Hex)

      user.send('sync:query', syncQuery)
    },

    _onMessage: function(user, message) {
      switch (message.type) {
        case 'sync:query':
          var syncQuery = message.data
          var query = {index: "room_id_and_created_at", lower: [this.id, syncQuery.newest + 1], upper: [this.id, ''], first: LIMIT}
          Messages.select(query, function(messages) {
            var result = messages
            var query = {index: "room_id_and_created_at", lower: [this.id], upper: [this.id, syncQuery.newest], last: LIMIT}
            Messages.select(query, function(messages) {
              var ids = messages.ids()
              var hash = CryptoJS.SHA1(ids.join('')).toString(CryptoJS.enc.Hex)
              if (hash != syncQuery.hash) {
                result.add(messages)
              }
              user.send('sync:result', result.attributes())
            }.bind(this))
          }.bind(this))
          break
        case 'sync:result':
          var messages = new Messages(_.filter(message.data, function(m) { return !this.messages.byId(m.id) }.bind(this)))
          messages.save()
          this.messages.add(messages)

          this.synchronizing = this.synchronizingQ.shift()
          if (this.synchronizing) {
            this._sync(this.synchronizing)
          }
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
