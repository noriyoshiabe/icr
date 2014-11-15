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
  App.ROOM_NAME_CHANGED = 'app:room_name_changed'

  var RECENT_ROOMS = 5

  _.extend(App.prototype, Observable.prototype, {
    start: function(room_id) {
      this.room_id = room_id

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
        this.rooms = new Rooms
        this._readCertificate()
      }
    },

    _readCertificate: function() {
      this.cert = new Certificate({id: 'user_cert'})
      this.cert.find(function(cert) {
        cert.user_id = cert.user_id || uuid.v4()
        cert.secret = cert.secret || uuid.v4()
        cert.save()

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
        this.users.remove(user)
        this.users.add(user)

        this._notify(App.READY)

        if (this.room_id) {
          this.enterRoom(this.room_id)
          this.room_id = null
        } else {
          this.rooms.select({index: "entered_at", last: RECENT_ROOMS}, function(rooms) {
            this._changeState(App.STATE_FRONT)
          }.bind(this))
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
        this._notify(App.USERNAME_REQUIRED, room_id, roomName)
        return
      }

      if (!room_id) {
        console.warn('enterRoom() room_id is not set.')
        room_id = uuid.v4()
      }

      this.room = new Room({id: room_id}, this.cert)
      this.room.find(function(room) {
        if (roomName) {
          this.room.set({name: roomName})
          this.room.save()
        }

        this.room.addObserver(this, this._onNotifyRoomEvent)
        this.room.enter(this.user)
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

      this.rooms.clear()
      this.rooms.select({index: "entered_at", last: RECENT_ROOMS}, function(rooms) {
        this._changeState(App.STATE_FRONT)
      }.bind(this))
    },

    switchRoom: function(room_id) {
      if (App.STATE_ROOM_ENTERED != this.state) {
        console.warn('leaveRoom() illegal state: ' + this.state)
        return
      }

      this.room.removeObserver(this)
      this.room.leave()
      this.enterRoom(room_id)
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

          this.rooms.clear()
          this.rooms.select({index: "entered_at", last: RECENT_ROOMS + 1}, function(rooms) {
            this.rooms.remove(this.room)
          }.bind(this))
          break

        case Room.USER_ADDED:
          var user = data
          this.users.add(user)
          break

        case Room.USER_CHANGED:
          var roomUser = data
          user = this.users.byId(roomUser.id)
          if (user && user != roomUser) {
            user.set(roomUser)
          }
          break

        case Model.CHANGED:
          if (App.STATE_ROOM_ENTERED == this.state) {
            this._notify(App.ROOM_NAME_CHANGED, this.room.name)
          }
          break
      }
    },

    _changeState: function(state) {
      var prevState = this.state
      this.state = state
      this._notify(App.CHANGE_STATE, state, prevState)
    }
  })

  return App
});
