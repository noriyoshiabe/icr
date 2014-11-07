(function(definition) {
  App = definition()
})(function() {
  'use strict'

  var App = function App() {
    Observable.apply(this)

    this.state = App.STATE_INIT
  }

  App.STATE_INIT = 'app:state_init'
  App.STATE_FRONT = 'app:state_front'
  App.STATE_ENTERING_ROOM = 'app:state_entering_room'
  App.STATE_ROOM_ENTERED = 'app:state_room_entered'

  App.READY = 'app:ready'
  App.CHANGE_STATE = 'app:change_state'
  App.USERNAME_REQUIRED = 'app:username_required'

  var RECENT_ROOMS = 5

  _.extend(App.prototype, Observable.prototype, {
    start: function() {
      var db = new DB('icr', 1)
      db.addSchemeDefinition(User)
      db.addSchemeDefinition(Room)
      db.addSchemeDefinition(Message)
      db.addSchemeDefinition(Certificate)
      db.addObserver(this, this._onNotifyDBEvent)
      db.open()
    },

    _onNotifyDBEvent: function(db, event) {
      if (DB.OPENED == event) {
        this.db = db
        this._readCertificate()
      }
    },

    _readCertificate: function() {
      this.cert = new Certificate({id: 'user_cert'})
      this.cert.find(function(cert) {
        cert.user_id = cert.user_id || uuid.v4()
        cert.secret = cert.secret || uuid.v4()
        cert.save()

        this._loadRooms()
      }.bind(this))
    },

    _loadRooms: function() {
      this.rooms = new Rooms
      this.rooms.select({index: "entered_at", last: RECENT_ROOMS}, function(rooms) {
        this._loadUsers()
      }.bind(this))
    },

    _loadUsers: function() {
      this.users = new Users
      this.users.selectAll(function(users) {
        this._loadUser()
      }.bind(this))
    },

    _loadUser: function() {
      this.user = new User({id: this.cert.user_id})
      this.user.find(function(user) {
        this._notify(App.READY)

        if (location.hash.match(/^#.*/)) {
          this.enterRoom(location.hash.substring(1))
        } else {
          this._changeState(App.STATE_FRONT)
        }
      }.bind(this))
    },

    userProfile: function(name, image_url) {
      this.user.set({name: name, image_url: image_url})
      this.user.save()
      if (this.room) {
        this.room.notifyUserUpdate()
      }
    },

    enterRoom: function(room_id, roomName) {
      this._changeState(App.STATE_ENTERING_ROOM)

      if (!this.user.name) {
        this._notify(App.USERNAME_REQUIRED, room_id)
        return
      }

      room_id = room_id || uuid.v4()

      this.room = new Room({id: room_id}, this.cert)
      this.room.find(function(room) {
        if (roomName) {
          this.room.set({name: roomName})
          this.room.save()
        }

        this.room.addObserver(this, this._onNotifyRoomEvent)
        this.room.enter(this.user)
        history.pushState('', document.title, '#' + room_id)
      }.bind(this))
    },

    leaveRoom: function() {
      if (App.STATE_ROOM_ENTERED != this.state) {
        console.warn('leaveRoom() illegal state: ' + this.state)
        return
      }

      this.room.removeObserver(this)
      this.room.leave()
      this.room = null
      this._changeState(App.STATE_FRONT)

      history.pushState('', document.title, '/')
    },

    switchRoom: function(room_id) {
      if (App.STATE_ROOM_ENTERED != this.state) {
        console.warn('leaveRoom() illegal state: ' + this.state)
        return
      }

      this.room.removeObserver(this)
      this.room.leave()
      this._changeState(App.STATE_FRONT)
      this.enterRoom(room_id)

      history.pushState('', document.title, '#' + room_id)
    },

    clearDB: function() {
      this._changeState(App.STATE_INIT)
      this.db.deleteAll()
      this.start()
    },

    _onNotifyRoomEvent: function(room, event, data) {
      switch (event) {
        case Room.ENTERED:
          this._changeState(App.STATE_ROOM_ENTERED)
          this.rooms.remove(room)
          this.rooms.add(room)
          if (RECENT_ROOMS < this.rooms.size()) {
            var willRemove = _.last(this.rooms.models, this.rooms.size() - RECENT_ROOMS)
            _.each(willRemove, function(room) {
              this.rooms.remove(room)
            }.bind(this))
          }
          break

        case Room.USER_ADDED:
          var user = data
          this.users.remove(user)
          this.users.add(user)
          break
      }
    },

    _changeState: function(state) {
      this.state = state
      this._notify(App.CHANGE_STATE, state)
    }
  })

  return App
});
