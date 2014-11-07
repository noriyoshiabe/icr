(function(definition) {
  FrontView = definition()
})(function() {
  'use strict'

  var template = null

  var FrontView = function FrontView(container, app) {
    Observable.apply(this)

    template = template || container.querySelector('#front')

    this.app = app
    this.el = document.importNode(template.content, true).firstElementChild

    this.createRoomForm = this.el.querySelector('#create-room')
    this.createRoomForm.addEventListener('submit', this._onSubmitCreateRoom.bind(this))

    this.recentRoomList = this.el.querySelector('.js-recent-room-list')
    this.recentRoomListItems = []

    this.clearDB = this.el.querySelector('.js-clear-db')
    this.clearDB.addEventListener('click', this._onClickClearDB.bind(this))

    this.app.rooms.each(function(room) {
      var listItem = new RecentRoomListItem(this.recentRoomList, room)
      listItem.addObserver(this, this._onNotifyRecentRoomListItemEvent)
      this.recentRoomList.appendChild(listItem.el)
      this.recentRoomListItems.push(listItem)
    }.bind(this))
  }

  FrontView.SUBMIT_CREATE_ROOM = 'front_view:submit_create_room'
  FrontView.CLICK_RECENT_ROOM = 'front_view:click_recent_room'
  FrontView.CLICK_CLEAR_DB = 'front_view:click_clear_db'

  _.extend(FrontView.prototype, Observable.prototype, {
    _onSubmitCreateRoom: function(e) {
      e.preventDefault()
      var roomName = e.target.elements["name"].value
      if (0 < roomName.length) {
        this._notify(FrontView.SUBMIT_CREATE_ROOM, roomName)
      }
    },

    _onClickRecentRoom: function(e) {
      this._notify(FrontView.CLICK_RECENT_ROOM, e.target.view.room)
    },

    _onClickClearDB: function(e) {
      this._notify(FrontView.CLICK_CLEAR_DB)
    },

    _onNotifyRecentRoomListItemEvent: function(listItem, event, data) {
      this._notify(event, data)
    },

    destroy: function() {
    }
  })

  return FrontView
});

(function(definition) {
  RecentRoomListItem = definition()
})(function() {
  'use strict'

  var template = null

  var RecentRoomListItem = function RecentRoomListItem(container, room) {
    Observable.apply(this)

    template = template || container.querySelector('#recent-room-list-item')

    this.room = room
    this.el = document.importNode(template.content, true).firstElementChild
    this.button = this.el.querySelector('.js-button')
    this.button.textContent = room.name ? room.name : room.id
    this.button.addEventListener('click', this._onClickButton.bind(this), false)
  }

  _.extend(RecentRoomListItem.prototype, Observable.prototype, {
    _onClickButton: function(e) {
      this._notify(FrontView.CLICK_RECENT_ROOM, this.room)
    }
  })

  return RecentRoomListItem
});
