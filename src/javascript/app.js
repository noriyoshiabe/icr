(function(definition) {
  App = definition()
})(function() {
  'use strict'

  var App = function App() {
    window.app = this
  }

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
        Base.db = db
        this.db = db
        window.db = db

        this._readSettings()
      }
    },

    _readSettings: function() {
      this.cert = new Certificate({id: 'user_cert'})
      this.cert.find(function(cert) {
        cert.user_id = cert.user_id || uuid.v4()
        cert.secret = cert.secret || uuid.v4()
        cert.save()

        this._loadUser()
      }.bind(this))
    },

    _loadUser: function() {
      this.user = new User({id: this.cert.user_id})
      this.user.find(function(user) {
        this.roomEnter() //TODO UIから
      }.bind(this))
    },

    roomEnter: function () {
      var room_id = location.hash.match(/^#.*/) ? location.hash.substring(1) : uuid.v4()

      this.room = new Room({id: room_id})
      this.room.messages.addObserver(this, function(messages, event, data) {
        console.log(data)
      })

      this.room.enter(this.user)

      location.hash = room_id
    }
  })

  return App
});
