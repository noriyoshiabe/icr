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
      var syncQuery = {to: to}
      var query = {index: "room_id_and_created_at", upper: to}

      var first = _.first(this.room.messages.models)
      if (first) {
        syncQuery.from = first.created_at
        syncQuery.not_in_ids = this.room.messages.ids()
        user.send('sync:query:message', syncQuery)
      } else {
        syncQuery.limit = this._limit
        syncQuery.not_in_ids = []
        user.send('sync:query:message', syncQuery)
      }
    },

    syncNotifyRoom: function() {
      this._broadcast('sync:notify:room', _.omit(this.room.attributes(), 'entered_at'))
    },

    syncNotifyUser: function() {
      this._broadcast('sync:notify:user', _.omit(this.room.user.attributes(), 'signature'))
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

          var query = {
            index: "room_id_and_created_at",
            lower: [this.room.id, syncQuery.from ? syncQuery.from : 0],
            upper: [this.room.id, syncQuery.to],
            last: syncQuery.limit ? syncQuery.limit : null
          }

          Messages.select(query, function(messages) {
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
