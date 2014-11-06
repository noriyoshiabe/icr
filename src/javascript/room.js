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
  Room.ENTERED = 'room:entered'

  _.extend(Room.prototype, Model.prototype, {
    properties: ['id', 'name', 'named_at', 'entered_at'],

    enter: function(user) {
      this.user = user
      this.user.addObserver(this, this._onNotifyUserEvent)
      this.users.add(this.user)

      this._readMessage()
    },

    roomName: function(name) {
      this.set({name: name, named_at: new Date().getTime()})
      this.save()
      this._broadcast('sync:notify:room', _.omit(this.attributes(), 'entered_at'))
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
      this.set({entered_at: new Date().getTime()})
      this.save()
      this._notify(Room.ENTERED)
    },

    leave: function() {
      this.users.models.forEach(function(user) {
        user.removeObserver(this)
      }.bind(this))
      this.srv.removeObserver(this)
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

    _broadcast: function(type, data) {
      this.users.models.forEach(function(user) {
        if (user != this.user) {
          user.send(type, data)
        }
      }.bind(this))
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
          this._syncUser(user)
          this._syncRoom(user)
          this._syncMessage(user)
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
        case Model.CHANGED:
          if (user == this.user) {
            this._broadcast('sync:notify:user', _.omit(this.user.attributes(), 'signature'))
          }
          break
      }
    },

    _syncUser: function(user) {
      user.send('sync:query:user')
    },

    _syncRoom: function(user) {
      user.send('sync:query:room')
    },

    _syncMessage: function(user) {
      var to = new Date().getTime()
      var syncQuery = {to: to}
      var query = {index: "room_id_and_created_at", upper: to}

      var first = _.first(this.messages.models)
      if (first) {
        syncQuery.from = first.created_at
        syncQuery.not_in_ids = this.messages.ids()
        user.send('sync:query:message', syncQuery)
      } else {
        syncQuery.limit = LIMIT
        syncQuery.not_in_ids = []
        user.send('sync:query:message', syncQuery)
      }
    },

    loadPrev: function() {
      var first = _.first(this.messages.models)
      if (!first) {
        return
      }

      var before = first.created_at - 1

      var query = {
        index: "room_id_and_created_at",
        lower: [this.id, 0],
        upper: [this.id, before],
        last: LIMIT
      }

      Messages.select(query, function(messages) {
        this.messages.add(messages)

        var syncQuery = {
          to: before,
          not_in_ids: messages.ids(),
          limit: LIMIT
        }

        this._broadcast('sync:query:message', syncQuery)
      }.bind(this))
    },

    _onMessage: function(user, message) {
      switch (message.type) {
        case 'sync:query:message':
          var syncQuery = message.data

          var query = {
            index: "room_id_and_created_at",
            lower: [this.id, syncQuery.from ? syncQuery.from : 0],
            upper: [this.id, syncQuery.to],
            last: syncQuery.limit ? syncQuery.limit : null
          }

          Messages.select(query, function(messages) {
            var results = _.reject(messages.attributes(), function(attrs) {
              return _.contains(syncQuery.not_in_ids, attrs.id)
            })
            user.send('sync:result:message', results)
          })
          break

        case 'sync:result:message':
          var unknownMessages = _.filter(message.data, function(m) {
            return !this.messages.contain(m)
          }.bind(this))
          var messages = new Messages(unknownMessages)
          messages.save()
          this.messages.add(messages)
          break

        case 'sync:query:user':
          user.send('sync:result:user', _.omit(this.user.attributes(), 'signature'))
          break

        case 'sync:result:user':
        case 'sync:notify:user':
          user.set(message.data)
          user.save()
          break

        case 'sync:query:room':
          user.send('sync:result:room', _.omit(this.attributes(), 'entered_at'))
          break

        case 'sync:result:room':
        case 'sync:notify:room':
          if (!this.named_at || this.named_at < message.data.named_at) {
            this.set(message.data)
            this.save()
          }
          break
      }
    },

    storeName: "rooms"
  })

  Room.schemeDefinition = function(db) {
    var store = db.createObjectStore("rooms", {keyPath: "id"})
    store.createIndex("entered_at", "entered_at", {unique: false})
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

    order: 'entered_at',
    desc: true
  })

  return Rooms
});
