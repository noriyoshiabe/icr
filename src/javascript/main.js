(function(definition) {
  Controller = definition()
})(function() {
  'use strict'

  var Controller = function Controller(options) {
    this.options = options || {}

    this.content = document.querySelector('.js-content')
    this.currentView = null

    this.app = new App()
    this.app.addObserver(this, this._onNotifyAppEvent)
  }

  Controller.prototype = {
    start: function() {
      this.app.start()
    },

    _switchView: function(view) {
      if (this.currentView) {
        this.content.removeChild(this.currentView.el)
        this.currentView.removeObserver(this)
        this.currentView.destroy()
      }

      this.content.appendChild(view.el)
      this.currentView = view
      this.currentView.addObserver(this, this._onNotifyViewEvent)
    },

    _onNotifyAppEvent: function(app, event, data) {
      switch (event) {
        case App.READY:
          if (this.options.debug) {
            window.db = DB.instance
            window.app = this.app
            window.controller = this
          }
          break

        case App.CHANGE_STATE:
          var state = data
          switch (state) {
            case App.STATE_FRONT:
              this._switchView(new FrontView(this.content, app))
              break

            case App.STATE_ROOM_ENTERED:
              this._switchView(new RoomView(this.content, app))
              break
          }
          break

        case App.USERNAME_REQUIRED:
          var room_id = data
          var username = ''
          while (!username || !username.length) {
            username = prompt("Please enter your name.")
          }
          this.app.userProfile(username)
          this.app.enterRoom(room_id)
          break
      }
    },

    _onNotifyViewEvent: function(view, event, data) {
      switch (event) {
        case FrontView.SUBMIT_CREATE_ROOM:
          var roomName = data
          this.app.enterRoom(null, roomName)
          break

        case FrontView.CLICK_RECENT_ROOM:
          var room = data
          this.app.enterRoom(room.id)
          break

        case FrontView.CLICK_CLEAR_DB:
          this.app.clearDB()
          break
      }
    }
  }

  return Controller
});


window.addEventListener('load', function() {
  new Controller().start()
});
