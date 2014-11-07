console.log('Hello!!')

window.addEventListener('load', function() {

  var app = new App()
  var content = document.querySelector('.js-content')
  var currentView = null

  app.addObserver(this, function(app, event, data) {
    console.log(event + (data ? ' : ' + data : ''))

    if (App.CHANGE_STATE == event && data == App.STATE_ROOM_ENTERED) {
      content.removeChild(currentView.el)
      currentView = new RoomView(content, app)
      content.appendChild(currentView.el)
    }

    if (App.READY == event) {
      currentView = new FrontView(content, app)
      content.appendChild(currentView.el)
    }
  })

  app.start()
});
