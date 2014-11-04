var express = require('express')

var app = express()

app.set('port', process.env.PORT || 3000)

app.use(express.static(__dirname + '/public'))
app.use(function(req, res, next) {
  res.status(404)
  res.sendfile(__dirname + '/public/404.html')
})

var httpServer = app.listen(app.get('port'), function() {
  console.log('Server listening on port %s', app.get('port'));
})
