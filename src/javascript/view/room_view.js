(function(definition) {
  RoomView = definition()
})(function() {
  'use strict'

  var template = null

  var RoomView = function RoomView(container, app) {
    Observable.apply(this)

    template = template || container.querySelector('#room')

    this.room = app.room
    this.messages = app.room.messages
    this.users = app.users
    this.roomUsers = app.room.users
    this.rooms = app.rooms

    this.el = document.importNode(template.content, true).firstElementChild

    this.messageList = {
      container: this.el.querySelector('.js-message-list'),
      cache: [],
      view: MessageListItem
    }

    this.memberList = {
      container: this.el.querySelector('.js-member-list'),
      cache: [],
      view: MemberListItem
    }

    this.roomList = {
      container: this.el.querySelector('.js-room-list'),
      cache: [],
      view: RoomListItem
    }

    this.messagesContainer = this.el.querySelector('.js-messages-container')
    this.messagesContainer.addEventListener('scroll', this._onScrollMessagesContainer.bind(this), false)

    this.messageForm = this.el.querySelector('#message-form')
    this.messageFormText = this.messageForm.querySelector('input[name="message"]')
    this.messageFormText.addEventListener('keypress', this._onKeyPressMessageFormText.bind(this), false)

    this.roomName = this.el.querySelector('.js-room-name')
    this.roomNameChange = this.el.querySelector('.js-room-name-change')
    this.roomNameChange.addEventListener('click', this._onClickRoomNameChange.bind(this), false)

    this.room.addObserver(this, this._onNotifyCurrentRoomEvent)
    this.messages.addObserver(this, this._onNotifyMessagesEvent)
    this.users.addObserver(this, this._onNotifyUsersEvent)
    this.roomUsers.addObserver(this, this._onNotifyRoomUsersEvent)
    this.rooms.addObserver(this, this._onNotifyRoomsEvent)

    this._renderRoomName()

    this.messages.each(function(message) {
      this._renderListItem(this.messageList, -1, message, this.users)
    }.bind(this))

    this.roomUsers.each(function(user) {
      this._renderListItem(this.memberList, -1, user)
    }.bind(this))

    this.rooms.each(function(room) {
      var listItem = this._renderListItem(this.roomList, -1, room)
      listItem.addObserver(this, this._onNotifyRoomListItemEvent)
    }.bind(this))
  }

  RoomView.SUBMIT_MESSAGE = 'room_view:submit_message'
  RoomView.CLICK_ROOM_NAME_CHANGE = 'room_view:click_room_name_change'
  RoomView.CLICK_ROOM = 'room_view:click_room'

  _.extend(RoomView.prototype, Observable.prototype, {
    _renderRoomName: function() {
      this.roomName.textContent = this.room.name ? this.room.name : this.room.id
    },

    _renderListItem: function(context, index, model, options) {
      var listItem = new context.view(context.container, model, options)
      if (-1 == index) {
        context.container.appendChild(listItem.el)
        context.cache.push(listItem)
      } else {
        var currentItem = context.cache[index]
        context.cache.splice(index, 0, listItem)
        context.container.insertBefore(listItem.el, currentItem ? currentItem.el : null)
      }
      return listItem
    },

    _onScrollMessagesContainer: function(e) {
      if (0 == e.target.scrollTop) {
        this.beforeScrollTopListItem = this.messageList.cache[0]
        this.room.loadPrev()
      }
    },

    _renderMessageListItem: function(context, index, model, options) {
      var listItem = this._renderListItem(context, index, model, options)
      if (this.beforeScrollTopListItem && index < this.messageList.cache.indexOf(this.beforeScrollTopListItem)) {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollTop + listItem.el.offsetHeight
      }
      return listItem
    },

    _removeListItem: function(context, model) {
      var listItem = _.findWhere(context.cache, {id: model.id})
      var index = context.cache.indexOf(listItem)
      context.cache.splice(index, 1)
      context.container.removeChild(listItem.el)
      listItem.destroy()
      return listItem
    },

    _onNotifyMessagesEvent: function(messages, event, message) {
      switch (event) {
        case Collection.ADDED:
          this._renderMessageListItem(this.messageList, messages.indexOf(message), message, this.users)
          break
      }
    },

    _onNotifyCurrentRoomEvent: function(user, event) {
      if (Model.CHANGED == event) {
        this._renderRoomName()
      }
    },

    _onNotifyUsersEvent: function(users, event, user) {
      switch (event) {
        case Collection.ADDED:
          var needAttach = _.filter(this.messageList.cache, function(view) {
            return view.message.sender_id == user.id
          })
          _.each(needAttach, function(view) {
            view.attachUser(user)
          })
          break
      }
    },

    _onNotifyRoomUsersEvent: function(users, event, user) {
      switch (event) {
        case Collection.ADDED:
          this._renderListItem(this.memberList, users.indexOf(user), user)
          break

        case Collection.REMOVED:
          this._removeListItem(this.memberList, user)
          break
      }
    },

    _onNotifyRoomsEvent: function(rooms, event, room) {
      switch (event) {
        case Collection.ADDED:
          var listItem = this._renderListItem(this.roomList, rooms.indexOf(room), room)
          listItem.addObserver(this, this._onNotifyRoomListItemEvent)
          break

        case Collection.REMOVED:
          this._removeListItem(this.roomList, room)
          break
      }
    },

    _onKeyPressMessageFormText: function(e) {
      if (e.keyCode == 13) {
        e.preventDefault()
        var input = e.target.form.elements["message"]
        if (0 < input.value.length) {
          this._notify(RoomView.SUBMIT_MESSAGE, input.value)
          input.value = ''
        }
      }
    },

    _onClickRoomNameChange: function(e) {
      this._notify(RoomView.CLICK_ROOM_NAME_CHANGE)
    },

    _onNotifyRoomListItemEvent: function(listItem, event, data) {
      this._notify(event, data)
    },

    setFromEnable: function(enable) {
      var elems = this.el.querySelectorAll('input, button')
      _.each(elems, function(el) {
        el.disabled = !enable
      })
    },

    destroy: function() {
      this.room.removeObserver(this)
      this.messages.removeObserver(this)
      this.users.removeObserver(this)
      this.roomUsers.removeObserver(this)
      this.rooms.removeObserver(this)
    }
  })

  return RoomView
});

(function(definition) {
  MessageListItem = definition()
})(function() {
  'use strict'

  var template = null

  var MessageListItem = function MessageListItem(container, message, users) {
    template = template || container.querySelector('#message-list-item')

    this.id = message.id

    this.el = document.importNode(template.content, true).firstElementChild
    this.avatar = this.el.querySelector('.js-avatar')
    this.username = this.el.querySelector('.js-username')
    this.date = this.el.querySelector('.js-date')
    this.body = this.el.querySelector('.js-body')

    this.message = message
    this.user = users.byId(message.sender_id)

    if (this.user) {
      this.user.addObserver(this, this._onNotifyUserEvent)
    }

    this._render()
  }

  MessageListItem.prototype = {
    _render: function() {
      this.avatar.src = this.user && this.user.image_url ? this.user.image_url : '/images/default.png'
      this.username.textContent = this.user ? this.user.name : 'Unknown'
      var date = new Date(this.message.created_at)
      this.date.textContent = date.getFullYear() + '/' + date.getMonth() + '/' + date.getDate() + ' ' + date.toLocaleTimeString()
      this.body.textContent = this.message.message
    },

    _onNotifyUserEvent: function(user, event) {
      if (Model.CHANGED == event) {
        this._render()
      }
    },

    attachUser: function(user) {
      if (!this.user) {
        this.user = user
        this.user.addObserver(this, this._onNotifyUserEvent)
      }
    },

    destroy: function() {
      if (this.user) {
        this.user.removeObserver(this)
      }
    }
  }

  return MessageListItem
});

(function(definition) {
  MemberListItem = definition()
})(function() {
  'use strict'

  var template = null

  var MemberListItem = function MemberListItem(container, user) {
    template = template || container.querySelector('#member-list-item')

    this.id = user.id

    this.el = document.importNode(template.content, true).firstElementChild
    this.avatar = this.el.querySelector('.js-avatar')
    this.username = this.el.querySelector('.js-username')

    this.user = user
    this.user.addObserver(this, this._onNotifyUserEvent)

    this._render()
  }

  MemberListItem.prototype = {
    _render: function() {
      this.avatar.src = this.user && this.user.image_url ? this.user.image_url : '/images/default.png'
      this.username.textContent = this.user ? this.user.name : 'Unknown'
    },

    _onNotifyUserEvent: function(user, event) {
      if (Model.CHANGED == event) {
        this._render()
      }
    },

    destroy: function() {
      this.user.removeObserver(this)
    }
  }

  return MemberListItem
});

(function(definition) {
  RoomListItem = definition()
})(function() {
  'use strict'

  var template = null

  var RoomListItem = function RoomListItem(container, room) {
    Observable.apply(this)

    template = template || container.querySelector('#room-list-item')

    this.id = room.id

    this.el = document.importNode(template.content, true).firstElementChild
    this.button = this.el.querySelector('.js-button')
    this.button.addEventListener('click', this._onClickRoom.bind(this), false)

    this.room = room
    this.room.addObserver(this, this._onNotifyRoomEvent)

    this._render()
  }

  _.extend(RoomListItem.prototype, Observable.prototype, {
    _render: function() {
      this.button.textContent = this.room.name ? this.room.name : this.room.id
    },

    _onClickRoom: function(e) {
      this._notify(RoomView.CLICK_ROOM, this.room)
    },

    _onNotifyRoomEvent: function(user, event) {
      if (Model.CHANGED == event) {
        this._render()
      }
    },

    destroy: function() {
      this.room.removeObserver(this)
    }
  })

  return RoomListItem
});
