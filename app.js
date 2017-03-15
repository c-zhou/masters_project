var fs           = require("fs"), // used to rename file uploads
    path         = require('path'),
    http         = require('http'),
    debug        = require('debug')('coinlab-streamformatics:server'),
    logger       = require('morgan'),
    express      = require('express'),
    favicon      = require('serve-favicon'),
    bodyParser   = require('body-parser'),
    formidable   = require('formidable'), // parses incoming form data (uploaded files)
    cookieParser = require('cookie-parser');


var app = express();


// Get port from environment and store in Express.
var port = normalizePort(process.env.PORT || '3000');
app.set('port', port);


// Create HTTP server.
var server = http.createServer(app);
var io = require('socket.io')(server);


// export io object so it can be used in the analysis route
module.exports = io;


// Listen on provided port, on all network interfaces.
server.listen(port, function(){
	console.log("Listening on port " + port);
});
server.on('error', onError);
server.on('listening', onListening);


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


// require routes
var index = require('./routes/index');
var about = require('./routes/about');
var upload = require('./routes/upload');
var analysis = require('./routes/analysis');


// use routes
app.use('/', index);
app.use('/about', about);
app.use('/upload', upload);
app.use('/analysis', analysis);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});


// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
	var port = parseInt(val, 10);

	if (isNaN(port)) {
		// named pipe
		return val;
	}

	if (port >= 0) {
		// port number
		return port;
	}

	return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
	if (error.syscall !== 'listen') {
		throw error;
	}

	var bind = typeof port === 'string'
		? 'Pipe ' + port
		: 'Port ' + port;

	// handle specific listen errors with friendly messages
	switch (error.code) {
		case 'EACCES':
			console.error(bind + ' requires elevated privileges');
			process.exit(1);
			break;
		case 'EADDRINUSE':
			console.error(bind + ' is already in use');
			process.exit(1);
			break;
		default:
			throw error;
	}
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
	var addr = server.address();
	var bind = typeof addr === 'string'
		? 'pipe ' + addr
		: 'port ' + addr.port;
	debug('Listening on ' + bind);
}
