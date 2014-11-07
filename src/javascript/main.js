console.log('Hello!!')

window.addEventListener('load', function() {

  var app = new App()

  app.addObserver(this, function(app, event, data) {
    console.log(event + (data ? ' : ' + data : ''))

    if (App.CHANGE_STATE == event && data == App.STATE_ROOM_ENTERED) {
      app.room.addObserver(this, function (room, event, data) {
        console.log(event)
      })
      app.room.users.addObserver(this, function (users, event, data) {
        console.log(event)
      })
      app.room.messages.addObserver(this, function (messages, event, data) {
        console.log(event)
      })

      console.log(app.rooms)
      console.log(app.room.messages)
    }

    if (App.READY == event) {
      var frontView = new FrontView(app)
      frontView.render()
    }
  })

  app.start()
});
