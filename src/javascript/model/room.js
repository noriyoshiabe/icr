(function(definition) {
  Room = definition()
})(function() {
  'use strict'

  var PAGE_SIZE = 50
  var RECCONECT_WAIT = 5000
  var CONNECT_WAIT = 2000

  var Room = function Room(attributes, cert) {
    Model.apply(this, arguments)

    this.cert = cert
    this.users = new Users
    this.messages = new Messages
    this.synchronizer = new Synchronizer(this, PAGE_SIZE)
  }

  Room.USER_ADDED = 'room:user_added'
  Room.USER_CHANGED = 'room:user_changed'
  Room.ENTERED = 'room:entered'
  Room.CHANGE_STATE = 'app:change_state'

  Room.STATE_OFFLINE = 'room:state_offline'
  Room.STATE_CONNECTING = 'room:state_connecting'
  Room.STATE_ONLINE = 'room:state_online'

  _.extend(Room.prototype, Model.prototype, {
    properties: ['id', 'name', 'named_at', 'entered_at'],

    enter: function(user) {
      this.user = user
      this.user.addObserver(this, this._onNotifyUserEvent)
      this.users.add(this.user)

      this.state = Room.STATE_OFFLINE

      this._readMessage()
    },

    roomName: function(name) {
      this.set({name: name, named_at: new Date().getTime()})
      this.save()
      this.synchronizer.syncNotifyRoom()
    },

    notifyUserUpdate: function() {
      this.synchronizer.syncNotifyUser()
    },

    _readMessage: function() {
      var query = {index: "room_id_and_created_at", lower: [this.id], upper:[this.id, ''], last: PAGE_SIZE}
      this.messages.select(query, function(messages) {
        this._connectServer()
      }.bind(this))
    },

    _connectServer: function() {
      this.srv = new SignalingServer(location.origin.replace(/^http/, 'ws'))
      this.srv.addObserver(this, this._onNotifySignalingServerEvent)
      this.srv.connect(this.id)
      this._changeState(Room.STATE_CONNECTING)
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

    updateMessage: function(message, changedMessage) {
      message.set({message: changedMessage, updated_at: new Date().getTime()})
      message.save()
      this.synchronizer.syncNotifyMessage(message)
    },

    _onNotifySignalingServerEvent: function(srv, event, data) {
      switch (event) {
        case SignalingServer.ON_CONNECTED:
          this._changeState(Room.STATE_ONLINE)
          this.disconnected = false
          this._finishEnter()
          break

        case SignalingServer.ON_DISCONNECTED:
          this.disconnected = true
          this._changeState(Room.STATE_OFFLINE)
          setTimeout(function() {
            this._changeState(Room.STATE_CONNECTING)
            setTimeout(function() {
              this.srv.connect(this.id)
            }.bind(this), CONNECT_WAIT)
          }.bind(this), RECCONECT_WAIT)
          break

        case SignalingServer.ON_CREATE_PEER:
          var peer = data
          var user = new User({peer: peer}, this.cert)
          user.addObserver(this, this._onNotifyUserEvent)
          break

        case SignalingServer.ON_REMOVE_PEER:
          break
      }
    },

    _onNotifyUserEvent: function(user, event, data) {
      switch (event) {
        case User.AUTHENTICATE_SECCESS:
          user.save()
          if (this.users.contain(user)) {
            this.users.byId(user.id).extend(user)
          } else {
            this.users.add(user)
          }

          this._notify(Room.USER_ADDED, user)
          this.synchronizer.syncQuery(user)
          break

        case User.AUTHENTICATE_FAILED:
          user.removeObserver(this)
          break

        case User.MESSAGE:
          var message = new Message(data)
          this.messages.add(message)
          message.save()
          break

        case User.ON_MESSAGE:
          this.synchronizer.onMessage(user, data)
          break

        case User.ON_DISCONNECTED:
          this.users.remove(user)
          break

        case Model.CHANGED:
          this._notify(Room.USER_CHANGED, user)
          break
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
        last: PAGE_SIZE
      }

      Messages.select(query, function(messages) {
        this.messages.add(messages)
        this.synchronizer.syncQueryMessages(messages, before)
      }.bind(this))
    },

    _changeState: function(state) {
      this.state = state
      this._notify(Room.CHANGE_STATE, state)
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
