(function(definition) {
  Synchronizer = definition()
})(function() {
  'use strict'

  var Synchronizer = function Synchronizer(room, pageSize) {
    this.room = room
    this.pageSize = pageSize
  }

  Synchronizer.prototype = {
    syncQuery: function(user) {
      user.send('sync:query:user')
      user.send('sync:query:room')

      var to = new Date().getTime()

      var syncQuery = null
      if (this.room.messages.isEmpty()) {
        user.send('sync:query:message', {not_in_ids: [], to: to, limit: this._limit})
      } else {
        var first = _.first(this.room.messages.models)
        user.send('sync:query:message', {not_in_ids: this.room.messages.ids(), from: first.created_at, to: to})
        user.send('sync:query:message:updates', {from: first.created_at, to: to})
      }
    },

    syncNotifyRoom: function() {
      this._broadcast('sync:notify:room', _.omit(this.room.attributes(), 'entered_at'))
    },

    syncNotifyUser: function() {
      this._broadcast('sync:notify:user', _.omit(this.room.user.attributes(), 'signature'))
    },

    syncNotifyMessage: function(message) {
      this._broadcast('sync:notify:message', message.attributes())
    },

    syncQueryMessages: function(messages, before) {
      var syncQuery = {
        to: before,
        not_in_ids: messages.ids(),
        limit: this.pageSize
      }

      this._broadcast('sync:query:message', syncQuery)
    },

    onMessage: function(user, message) {
      switch (message.type) {
        case 'sync:query:message':
          var syncQuery = message.data

          Messages.select(this._buildQuery(syncQuery), function(messages) {
            var results = _.reject(messages.attributes(), function(attrs) {
              return _.contains(syncQuery.not_in_ids, attrs.id)
            })
            user.send('sync:result:message', results)
          })
          break

        case 'sync:result:message':
          var unknownMessages = _.filter(message.data, function(m) {
            return !this.room.messages.contain(m)
          }.bind(this))
          var messages = new Messages(unknownMessages)
          messages.save()
          this.room.messages.add(messages)
          break

        case 'sync:query:message:updates':
          var syncQuery = message.data

          Messages.select(this._buildQuery(syncQuery), function(messages) {
            var results = _.filter(messages.attributes(), function(attrs) {
              return !!attrs.updated_at
            })
            user.send('sync:result:message:updates', results)
          })
          break

        case 'sync:result:message:updates':
          _.each(message.data, function(message) {
            this._updateMessage(message)
          }.bind(this))
          break

        case 'sync:notify:message':
          this._updateMessage(message.data)
          break

        case 'sync:query:user':
          user.send('sync:result:user', _.omit(this.room.user.attributes(), 'signature'))
          break

        case 'sync:result:user':
        case 'sync:notify:user':
          user.set(message.data)
          user.save()
          break

        case 'sync:query:room':
          user.send('sync:result:room', _.omit(this.room.attributes(), 'entered_at'))
          break

        case 'sync:result:room':
        case 'sync:notify:room':
          if (!this.room.named_at || this.room.named_at < message.data.named_at) {
            this.room.set(message.data)
            this.room.save()
          }
          break
      }
    },

    _buildQuery: function(syncQuery) {
      return {
        index: "room_id_and_created_at",
        lower: [this.room.id, syncQuery.from ? syncQuery.from : 0],
        upper: [this.room.id, syncQuery.to],
        last: syncQuery.limit ? syncQuery.limit : null
      }
    },

    _updateMessage: function(message) {
      var mine = this.room.messages.byId(message.id)
      if (mine) {
        if (!mine.updated_at || mine.updated_at < message.updated_at) {
          mine.set(message)
          mine.save()
        }
      }
    },

    _broadcast: function(type, data) {
      var message = JSON.stringify({type: type, data: data})
      _.each(this.room.users.models, function(user) {
        _.each(user.peers, function(peer) {
          if (peer instanceof Peer) {
            peer.send(message)
          }
        })
      })
    }
  }

  return Synchronizer
});
