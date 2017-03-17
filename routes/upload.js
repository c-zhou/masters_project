const path        = require('path'),
      spawn       = require('child_process').spawn,
      UPLOAD_DIR  = path.join(__dirname, "../../uploads/");

var io         = require('../app.js'),
    fs         = require('fs'), // used to rename file uploads
    qs         = require('qs'), // package to parse serialized form data
    db         = require(path.join(path.dirname(require.main.filename), '../db.json')),
    url        = require('url'),
    http       = require('http'),
    kill       = require('tree-kill'),
    express    = require('express'),
    router     = express.Router(),
    jsonfile   = require('jsonfile'),
    Metadata   = require('../models/metadata'), // constructor for database object
    formidable = require('formidable'), // parses incoming form data (uploaded files)
    speciesList = require('../middleware/speciesNamesParse')();

// GET upload page
router.get("/", function(req, res){
	res.render("upload");
});

router.get('/json', function(req, res) {
	jsonfile.readFile('../../organism_info.json', function(err, d) {
		if (err) { console.log(err);}
		console.log(d);
		res.send(d);
	})
});

// POST uploading file
router.post("/", function(req, res){
	console.log("Post request received...");

	// if request is received from an ajax form (i.e the file uploader)
	if (req.xhr) {
		uploadLocalFile(req, res);
	}
});

// websocket to handle upload by URL request
io.of('/upload').on('connection', function(socket){
	// this event contains the path the user entered for where their reads are located
	socket.on('formData', function(data) {
		data.metadata = qs.parse(data.metadata); // parse the serialised metadata
		downloadFilecURL(socket, data, function(err) {
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

function downloadFilecURL(socket, data, cb){
	var curlArgs  = ['-#'],
        prevChunk = 0;

	data.urls.forEach(function(item) {
		// extract filename
		var fileName = UPLOAD_DIR + path.basename(item);

		// add url to scriptArgs
		curlArgs.push('-o', fileName, item);
	});

	// execute curl using child process
	const curl = spawn('curl', curlArgs);

	curl.on('error', function(err) {
		if (err) { throw err; }
	});

	curl.stderr.setEncoding('utf8');

	// when there is no more data to be consumed from the stream
	curl.stdout.on('end', function(){
		console.log("download complete");
		socket.emit('downloadComplete');
		writeMetadataEntry(data.urls, data.metadata);
		prevChunk = 0;
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

	socket.on('disconnect', function() {
		console.log("Socket disconnected...");
			kill(curl.pid, 'SIGTERM', function (err) {
				if (err) {
					console.log(err);
				} else {
					console.log("Curl process killed!");
				}
			});
	});

	socket.on('kill', function() {
		// unlink all downloaded files (and those to come) from the system
		for (var i = 2; i < curlArgs.length; i += 3) {
			var fileName = curlArgs[i];
			fs.unlink(fileName, function(err) {
				if (err) { console.log(err); }
			});
		}
		socket.disconnect(true);
	});
}

// function to upload a user's specified local file
function uploadLocalFile(req, res){
    // create an incoming form object
    var form = new formidable.IncomingForm({
        encoding: 'utf-8',
        keepExtensions: true,
        multiples: true,
        type: "multipart",
        uploadDir: UPLOAD_DIR
	});

	var data,
	    filePaths = [];

    // TODO add error catch incase user uploads something other than FASTQ
    // Make sure file type is correct
    // ...

	form.on('field', function(name, value) {
		data = qs.parse(value); // parse the serialised data into an object
	});

    // every time a single file has been uploaded successfully
    // rename it to it's original name
    form.on('file', function (name, file) {
    	var newFilePath = path.join(form.uploadDir, file.name);
        fs.rename(file.path, newFilePath);
        filePaths.push(newFilePath);
    });

    // log any errors that occur
    form.on('error', function (err) {
    	// if the user presses the STOP button
    	if (err.message === 'Request aborted') {
    		console.log('You have requested to cancel the file upload!');

    		// loop through all of the files that were submitted and cancel and delete them
			form.openedFiles.forEach(function(f) {
				fs.unlink(f.path, function(err) {
					if (err) { console.log(err); }
				});
			});
			res.redirect('/upload');
		} else {
            throw err;
        }
    });

    // once all the files have been uploaded, send a response to the client
    form.on('end', function () {
    	console.log("File upload ended");
    	writeMetadataEntry(filePaths, data);
        res.end("success");
    });

    // parse the incoming request containing the form data
    form.parse(req);
}

function writeMetadataEntry(filePaths, data) {
	var md = new Metadata(filePaths, data);
	db.push(md);
	var mdPath = path.join(path.dirname(require.main.filename), '../db.json');
	jsonfile.writeFileSync(mdPath, db, { spaces: 4 });
}
