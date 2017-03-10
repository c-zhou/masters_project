var express    = require('express'),
    router     = express.Router(),
    io         = require('../app.js'),
    formidable = require('formidable'), // parses incoming form data (uploaded files)
	fs         = require('fs'), // used to rename file uploads
	path       = require('path'),
	kill       = require('tree-kill'),
	url        = require('url'),
    http       = require('http'),
    spawn      = require('child_process').spawn;

const UPLOAD_DIR = path.join(__dirname, "../uploads/");

// GET upload page
router.get("/", function(req, res){
	res.render("upload");
});

// POST uploading file
router.post("/", function(req, res){
	console.log("Post request received...");

	// if request is received from an ajax form (i.e the file uploader)
	if (req.xhr) {
		getFile(req, res);
	}
});

// websocket to handle upload by URL request
io.of('/upload').on('connection', function(socket){
	// this event contains the path the user entered for where their reads are located
	socket.on('urls', function(data) {
		var urls = data.urls;
		downloadFilecURL(socket, urls, function(err) {
			if (err) {
				console.log(err);
			}
		});
	});
});

module.exports = router;

// ============================================================================
// MIDDLEWARE
// ============================================================================

// TODO add these functions into a middleware folder

function downloadFilecURL(socket, urls, cb){
	var curlArgs = ['-#'];

	urls.forEach(function(item) {
		// extract filename
		var fileName = UPLOAD_DIR + url.parse(item).pathname.split("/").pop();

		// add url to scriptArgs
		curlArgs.push('-o', fileName, item);
	});

	// execute curl using child process
	const curl = spawn('curl', curlArgs);

	curl.on('error', function(err) {
		if (err) { throw err; }
	});

	curl.stderr.setEncoding('utf8');

	// add an end event listener
	curl.stdout.on('end', function(){
		console.log("download complete");
		socket.emit('downloadComplete');
		prevChunk = 0;
	});

	socket.on('disconnect', function() {
		console.log("Socket disconnected...");
		// if (curl.connected) {
			kill(curl.pid, 'SIGTERM', function (err) {
				if (err) {
					console.log(err);
				} else {
					console.log("Curl process killed!");
				}
			});
		// }
	});

	curl.on('close', function(code, signal) {
		if (code){ cb("Curl closed with code " + code); }
		else if (signal){ cb("Curl closed with signal " + signal); }
		else { console.log("Curl closed...") }
		// disconnect the websocket
		socket.disconnect(true);
	});

	// when the child process exits, check if there were any errors
	curl.on('exit', function(code, signal){
		if (code){ cb("Curl exited with code " + code); }
		else if (signal){ cb("Curl exited with signal " + signal); }
		else { console.log("Curl exited...") }
	});

	var prevChunk = 0;

	curl.stderr.on('data', function(chunk){
		if (chunk.indexOf('%') > -1) {
			// extract the number from the line
			var percComplete = chunk.split('#').join('').trim().replace('%', '');

			// some lines dont contain numbers so change them to null otherwise
			percComplete = parseInt(percComplete) || null;

			// make sure there is an integer present and that it isnt lower than the last
			// there is some random numbers occasionally that are missing the first digit
			if (percComplete && percComplete >= prevChunk){
				socket.emit('progress', percComplete);
				prevChunk = percComplete
			}
		}
	});
}

// function to upload a user's specified local file
function getFile(req, res){
    // create an incoming form object
    var form = new formidable.IncomingForm({
        encoding: 'utf-8',
        keepExtensions: true,
        multiples: true,
        type: "multipart",
        uploadDir: UPLOAD_DIR
	});

    // TODO add error catch incase user uploads something other than FASTQ
    // Make sure file type is correct
    // ...

    // every time a single file has been uploaded successfully
    // rename it to it's original name
    form.on("file", function (field, file) {
        fs.rename(file.path, path.join(form.uploadDir, file.name));
    });

    // log any errors that occur
    form.on("error", function (err) {
        throw err;
    });

    // once all the files have been uploaded, send a response to the client
    form.on("end", function () {
        res.end("success");
    });

    // parse the incoming request containing the form data
    form.parse(req);
}