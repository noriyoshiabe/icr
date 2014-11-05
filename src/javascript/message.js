(function(definition) {
  Message = definition()
})(function() {
  'use strict'

  var Message = function Message(attributes) {
    Model.apply(this, arguments)
  }

  _.extend(Message.prototype, Model.prototype, {
    properties: ['id', 'room_id', 'sender_id', 'message', 'created_at'],

    storeName: "messages"
  })

  Message.schemeDefinition = function(db) {
    var store = db.createObjectStore("messages", {keyPath: "id"})
    store.createIndex("room_id_and_created_at", ["room_id", "created_at"], {unique: false})
  }

  Message.create = function(room_id, sender_id, message) {
    return {
      id: uuid.v4(),
      room_id: room_id,
      sender_id: sender_id,
      message: message,
      created_at: new Date().getTime()
    }
  }

  return Message
});

(function(definition) {
  Messages = definition()
})(function() {
  'use strict'

  var Messages = function Messages(objects) {
    Collection.apply(this, arguments)
  }

  _.extend(Messages.prototype, Collection.prototype, {
    model: Message
  })

  Messages.select = function(query, callback) {
    new Messages().select(query, callback)
  }

  return Messages
});
