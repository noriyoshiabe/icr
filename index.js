var express = require('express')
var basicAuth = require('basic-auth-connect')

var app = express()

app.set('port', process.env.PORT || 3000)

if (process.env.BASIC_AUTH_USER && process.env.BASIC_AUTH_PASS) {
  app.use(basicAuth(process.env.BASIC_AUTH_USER, process.env.BASIC_AUTH_PASS))
}

app.get('*', function(req,res,next) {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !='https') {
    res.redirect('https://' + req.headers.host + req.url)
  } else {
    next()
  }
})

app.use(express.static(__dirname + '/public'))
app.use(function(req, res, next) {
  res.status(404)
  res.sendfile(__dirname + '/public/404.html')
})

var httpServer = app.listen(app.get('port'), function() {
  console.log('Server listening on port %s', app.get('port'));
})


var ws = require('ws')
var wsServer = new ws.Server({server: httpServer});
var rooms = {}

var Client = function Client(socket, id, room_id) {
  this.socket = socket
  this.id = id
  this.room_id = room_id
}

Client.prototype = {
  addToRoom: function(rooms) {
    rooms[this.room_id] = rooms[this.room_id] || {}
    rooms[this.room_id][this.id] = this
    this.room = rooms[this.room_id]
  },
  removeFromRoom: function() {
    delete this.room[this.id]
    this.room = null
  },
  send: function(data) {
    this.socket.send(data)
  }
}

wsServer.on('connection', function(socket) {
  var fd = socket._socket._handle.fd
  console.log('Connection started. fd=' + fd)

  var client = null

  socket.on('message', function(data) {
    var message

    try {
      message = JSON.parse(data)
    } catch (e) {
      console.error(e)
      return
    }

    switch (message.type) {
      case 'enter':
        if (message.room_id && message.from) {
          console.log('Received enter: room=' + message.room_id + ' from=' + message.from)

          if (client) {
            client.removeFromRoom()
          }

          client = new Client(socket, message.from, message.room_id)
          client.addToRoom(rooms)
        }
        break

      case 'ping':
        socket.send(JSON.stringify({type: 'pong'}))
        break
    }

    if (client) {
      if (message.to) {
        var c = client.room[message.to]
        if (c) {
          c.send(data)
        }
      } else {
        for (var c_id in client.room) {
          var c = client.room[c_id]
          if (c && c.socket != socket) {
            c.send(data)
          }
        }
      }
    }
  })

  socket.on('close', function() {
    console.log('Connection closed. fd=' + fd)

    if (client) {
      client.removeFromRoom()
    }
  })
})
