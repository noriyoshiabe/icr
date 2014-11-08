(function(definition) {
  Controller = definition()
})(function() {
  'use strict'

  var SITE_NAME = 'INSTANT CHAT ROOM'

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
      this.app.start(location.hash.match(/^#.*/) ? location.hash.substring(1) : null)
      window.addEventListener('popstate', this._onPopState.bind(this), false)
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
      this.headerView.setFromEnable(false)
      if (this.currentView) {
        this.currentView.setFromEnable(false)
      }

      if (this.currentModal) {
        this._dismissModal()
      }
      this.currentModal = modal
      this.currentModal.addObserver(this, this._onNotifyViewEvent)
      this.documentBody.appendChild(modal.el)
    },

    _dismissModal: function() {
      this.headerView.setFromEnable(true)
      if (this.currentView) {
        this.currentView.setFromEnable(true)
      }

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
              document.title = SITE_NAME
              break

            case App.STATE_ROOM_ENTERED:
              this._switchView(new RoomView(this.content, app))
              this.currentView.scrollToBottom()
              document.title = (this.app.room.name ? this.app.room.name : this.app.room.id) + ' - ' + SITE_NAME
              break
          }
          break

        case App.USERNAME_REQUIRED:
          var room_id = data1
          var roomName = data2
          this._showModal(new UserNameDialog({id: room_id, name: roomName}))
          break

        case App.ROOM_NAME_CHANGED:
          var roomName = data1
          document.title = roomName + ' - ' + SITE_NAME
          break
      }
    },

    _onPopState: function(e) {
      if (location.hash.match(/^#.*/)) {
        var room_id = location.hash.substring(1)
        switch (this.app.state) {
          case App.STATE_FRONT:
            this.app.enterRoom(room_id)
            break
          case App.STATE_ROOM_ENTERED:
            this.app.switchRoom(room_id)
            break
        }
      } else {
        switch (this.app.state) {
          case App.STATE_ROOM_ENTERED:
            this.app.leaveRoom()
            break
        }
      }
    },

    _onNotifyViewEvent: function(view, event, data1, data2) {
      switch (event) {
        case HeaderView.CLICK_LOGO:
          if (App.STATE_ROOM_ENTERED == this.app.state) {
            this.app.leaveRoom()
            history.pushState({}, document.title, '/')
          }
          break

        case HeaderView.CLICK_SETTINGS:
          this._showModal(new UserProfileDialog(this.app))
          break

        case FrontView.SUBMIT_CREATE_ROOM:
          var roomName = data1
          var room_id = uuid.v4()
          this.app.enterRoom(room_id, roomName)
          history.pushState({}, document.title, '#' + room_id)
          break

        case FrontView.CLICK_RECENT_ROOM:
          var room = data1
          this.app.enterRoom(room.id)
          history.pushState({}, document.title, '#' + room.id)
          break

        case FrontView.CLICK_CLEAR_DB:
          this.app.clearDB()
          break

        case RoomView.SUBMIT_MESSAGE:
          var message = data1
          this.app.room.sendMessage(message)
          break

        case RoomView.CLICK_ROOM_NAME_CHANGE:
          this._showModal(new RoomNameDialog())
          break

        case RoomView.CLICK_ROOM:
          var room = data1
          this.app.switchRoom(room.id)
          history.pushState({}, document.title, '#' + room.id)
          break

        case Modal.CANCEL:
          this._dismissModal()
          break

        case UserNameDialog.SUBMIT:
          var username = data1
          var roomInfo = data2
          this.app.userProfile(username)
          this.app.enterRoom(roomInfo.id, roomInfo.name)
          history.pushState({}, document.title, '#' + roomInfo.id)
          this._dismissModal()
          break

        case RoomNameDialog.SUBMIT:
          var roomName = data1
          this.app.room.roomName(roomName)
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
