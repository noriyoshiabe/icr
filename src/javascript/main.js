(function(definition) {
  Controller = definition()
})(function() {
  'use strict'

  var Controller = function Controller() {
    this.content = document.querySelector('.js-content')
    this.currentView = null

    this.documentBody = document.querySelector('body')
    this.currentModal = null

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

    _showModal: function(modal) {
      if (this.currentModal) {
        this._dismissModal()
      }
      this.currentModal = modal
      this.currentModal.addObserver(this, this._onNotifyViewEvent)
      this.documentBody.appendChild(modal.el)
    },

    _dismissModal: function() {
      this.documentBody.removeChild(this.currentModal.el)
      this.currentModal.removeObserver(this)
      this.currentModal = null
    },

    _onNotifyAppEvent: function(app, event, data1, data2) {
      switch (event) {
        case App.READY:
          if (__DEBUG__) {
            window.db = DB.instance
            window.app = this.app
            window.controller = this
          }

          this.headerView = new HeaderView(this.app)
          this.headerView.addObserver(this, this._onNotifyViewEvent)
          break

        case App.CHANGE_STATE:
          var state = data1
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
          var room_id = data1
          var roomName = data2
          var username = ''
          while (!username || !username.length) {
            username = prompt("Please enter your name.")
          }
          this.app.userProfile(username)
          this.app.enterRoom(room_id, roomName)
          break
      }
    },

    _onNotifyViewEvent: function(view, event, data1, data2) {
      switch (event) {
        case HeaderView.CLICK_LOGO:
          if (App.STATE_ROOM_ENTERED == this.app.state) {
            this.app.leaveRoom()
          }
          break

        case HeaderView.CLICK_SETTINGS:
          this._showModal(new UserProfileDialog(this.app))
          break

        case FrontView.SUBMIT_CREATE_ROOM:
          var roomName = data1
          this.app.enterRoom(null, roomName)
          break

        case FrontView.CLICK_RECENT_ROOM:
          var room = data1
          this.app.enterRoom(room.id)
          break

        case FrontView.CLICK_CLEAR_DB:
          this.app.clearDB()
          break

        case RoomView.SUBMIT_MESSAGE:
          var message = data1
          this.app.room.sendMessage(message)
          break

        case RoomView.CLICK_ROOM_NAME_CHANGE:
          var roomName = ''
          while (!roomName || !roomName.length) {
            roomName = prompt("Please enter room name.")
          }
          this.app.room.roomName(roomName)
          break

        case RoomView.CLICK_ROOM:
          var room = data1
          this.app.switchRoom(room.id)
          break

        case Modal.CANCEL:
          this._dismissModal()
          break

        case UserProfileDialog.SUBMIT:
          var name = data1
          var image_url = data2
          this.app.userProfile(name, image_url)
          this._dismissModal()
          break
      }
    }
  }

  return Controller
});


window.addEventListener('load', function() {
  new Controller().start()
});
