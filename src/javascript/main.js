console.log('Hello!!')

window.addEventListener('load', function() {
  var user_id = uuid.v4()
  var room_id = location.hash.match(/^#.*/) ? location.hash.substring(1) : uuid.v4()

  var room = new Room({id: room_id})
  window._r = room

  room.messages.addObserver(this, function(messages, event, data) {
    console.log(data)
  })

  var user = new User({id: user_id})
  room.enter(user)

  location.hash = room_id
});
