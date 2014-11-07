(function(definition) {
  FrontView = definition()
})(function() {
  'use strict'

  var FrontView = function FrontView(app) {
    Observable.apply(this)

    this.app = app
    this.el = document.querySelector('#front')

    this.createRoomForm = this.el.querySelector('#create-room')
    this.createRoomForm.addEventListener('submit', this._onSubmitCreateRoom.bind(this))

    this.recentRoomList = this.el.querySelector('.js-recent-rooms')
    this.recentRoomListItems = []
    this.app.rooms.addObserver(this, this._onNotifyRoomsEvent)

    this.clearDB = this.el.querySelector('.js-clear-db')
    this.clearDB.addEventListener('click', this._onClickClearDB.bind(this))
  }

  FrontView.SUBMIT_CREATE_ROOM = 'front_view:submit_create_room'
  FrontView.CLICK_RECENT_ROOM = 'front_view:click_recent_room'
  FrontView.CLICK_CLEAR_DB = 'front_view:click_clear_db'

  _.extend(FrontView.prototype, Observable.prototype, {
    render: function() {
      this.app.rooms.each(function(room) {
        var listItem = new RecentRoomListItem(room)
        listItem.button.addEventListener('click', this._onClickRecentRoom.bind(this), false)
        this.recentRoomList.appendChild(listItem.el)
        this.recentRoomListItems.push(listItem)
      }.bind(this))
    },

    _onSubmitCreateRoom: function(e) {
      e.preventDefault()
      this._notify(FrontView.SUBMIT_CREATE_ROOM, e.target.elements["name"].value)
    },

    _onClickRecentRoom: function(e) {
      this._notify(FrontView.CLICK_RECENT_ROOM, e.target.view.room)
    },

    _onClickClearDB: function(e) {
      this._notify(FrontView.CLICK_CLEAR_DB)
    },

    _onNotifyRoomsEvent: function(rooms, event, room) {
      switch (event) {
        case Collection.ADDED:
          var listItem = new RecentRoomListItem(room)
          listItem.button.addEventListener('click', this._onClickRecentRoom.bind(this), false)
          var index = rooms.models.indexOf(room)
          var currentItem = this.recentRoomListItems[index]
          this.recentRoomListItems.splice(index, 0, listItem)
          this.recentRoomList.insertBefore(listItem.el, currentItem ? currentItem.el : null)
          break

        case Collection.UPDATED:
          var index = rooms.models.indexOf(room)
          this.recentRoomListItems[index].update(room)
          break

        case Collection.REMOVED:
          var willRemove = _.find(this.recentRoomListItems, function(listItem) {
            return listItem.room == room
          })
          var index = this.recentRoomListItems.indexOf(willRemove)
          this.recentRoomListItems.splice(index, 1)
          this.recentRoomList.removeChild(willRemove.el)
          break
      }
    }
  })

  return FrontView
});

(function(definition) {
  RecentRoomListItem = definition()
})(function() {
  'use strict'

  var template = null

  var RecentRoomListItem = function RecentRoomListItem(room) {
    template = template || document.querySelector('#recent-room-list-item')

    this.room = room
    this.el = document.importNode(template.content, true).firstElementChild
    this.button = this.el.querySelector('.js-button')
    this.button.textContent = room.name ? room.name : room.id
    this.button.view = this
  }

  RecentRoomListItem.prototype = {
    update: function(room) {
      this.button.textContent = room.name ? room.name : room.id
    }
  }

  return RecentRoomListItem
});
