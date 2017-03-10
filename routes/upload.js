var express    = require('express'),
    router     = express.Router(),
    io       = require('../app.js'),
    formidable = require('formidable'), // parses incoming form data (uploaded files)
	fs         = require('fs'), // used to rename file uploads
	path       = require('path'),
	url        = require('url'),
    http       = require('http'),
	Client     = require('ftp'),
	https      = require('https'),
    exec       = require('child_process').exec,
    spawn      = require('child_process').spawn;


const UPLOAD_DIR = path.join(__dirname, "../uploads/");

// GET upload page
router.get("/", function(req, res){
	res.render("upload");
});

// POST uploading file
router.post("/", function(req, res){
	console.log("Post request received...");

	if (req.header('content-type') === 'application/json') {
		var urls = req.body.urls;

		console.log(urls);

		urls.forEach(function(url) {
			downloadFilecURL(url, function(err) {
				if (err){
					res.send(err);
				} else {
					res.end('success');
				}
			});
		});
	} else {
		getFile(req, res);
	}

    // console.log(formTypes[req.header('content-type')]);
    // console.log('body: ' + JSON.stringify(req.body));
    // console.log(req.header('content-type'));
    // // check if the post request has come from the local file upload or URL upload form
    // // req.xhr A Boolean property that is true if the request’s X-Requested-With header field is
    // // “XMLHttpRequest”, indicating that the request was issued by a client library such as jQuery.
    // if (!req.xhr){
		// // Getting to here indicates the user has requested to upload a file from a URL
		// // set the path to the file, including the file's name
		// var dest = UPLOAD_DIR + req.body.uploadURL.split("/").pop();
    //
		// // download file using curl
		// downloadFilecURL(req.body.uploadURL, function(err){
		// 	if (err){
		// 		res.send(err);
		// 	} else {
		// 		res.redirect("/upload");
		// 	}
		// });
    //
		// // download the file at the URL
		// // download(req.body.uploadURL, dest, function(err){
		// // 	// handle error
		// // 	if (err) {
		// // 		// TODO handle errors properly
		// // 		res.send(err.message);
		// // 	} else {
    //      //        // refresh the page once the file is complete
    //      //        res.redirect('/upload');
    //      //    }
		// // });
    // } else {
    //     // Getting to here indicates that the user has requested to upload a local file
		// // upload the file to the server
		// console.log("Uploading file...");
		// getFile(req, res);
    // }
});

io.of('/upload').on('connection', function(socket){
	var scriptArgs;
	// EVENT LISTENERS ON THE WEBSOCKET THAT WILL INTERACT WITH THE CLIENT/USER

	// this event contains the path the user entered for where their reads are located
	socket.on('urls', function(data) {

		var urls = data.urls;

		downloadFilecURL(socket, urls);
	});

	// this event is triggered when the user clicks the start button to begin species typing
	socket.on('startAnalysis', function(){
		console.log("Starting species typing...");

		// call function which handles initiating the child process for species typing
		// and all of the socket events/emitters needed to send the stdout to the client
		startSpeciesTyping(socket, scriptArgs);

	});
});




// TODO add these functions into a middleware folder
// function for downloading from URL - archived. will delete if curl continues to work.
// var download = function(uploadURL, dest, cb){
// 	console.log("download function called");
// 	var supportedLibraries = {
// 		"http:": http,
// 		"https:": https,
// 		// "ftp:": new Client()
// 		"ftp:": http
// 	};
// 	var parsed = url.parse(uploadURL);
// 	// console.log(parsed);
// 	var lib = supportedLibraries[parsed.protocol || "http:"];
//
// 	if (parsed.protocol === "ftp:"){
// 		var split = uploadURL.split(":");
// 		split[0] = "http";
// 		uploadURL = split.join(":");
// 		console.log(uploadURL);
// 	}
// 	var file = fs.createWriteStream(dest);
// 	var request = lib.get(uploadURL, function(stream){
// 		// variable to keep track of size of file
// 		var total = stream.headers['content-length'];
// 		var prog = 0;
//
// 		stream.on('data', function(chunk){
// 			prog += chunk.length;
// 			var perc = parseInt(prog / total * 100);
// 			console.log(perc + "% downloaded...");
// 		});
//
// 		stream.pipe(file);
//
// 		// checks for how much has been written every second
//
// 		// var timer = setTimeout(function(){console.log(file.bytesWritten)}, 1000);
//
// 		file.on('finish', function(){
// 			// clearInterval(timer);
// 			// close() is async, call cb after close completes
// 			console.log("FINISHED!");
// 			file.close(cb);
// 		})
// 			.on('error', function(err){
// 				// delete the file async
// 				fs.unlink(dest);
// 				if (cb) {
// 					cb(err.message);
//                 }
// 			});
// 	});
// };

// function downloadFilewget(file_url) {
// 	var fileName = url.parse(file_url).pathname.split('/').pop();
//
// 	var file = fs.createWriteStream(UPLOAD_DIR + fileName);
//
// 	var wget = 'wget -P ' + UPLOAD_DIR + ' ' + file_url;
//
// 	// execute curl using child process
// 	var wget = spawn('wget', ['-P', UPLOAD_DIR, file_url]);
//
// 	// add a a data event listener
// 	wget.stdout.on('data', function(chunk){
// 		file.write(chunk);
// 	});
//
// 	// add an end event listener
// 	wget.stdout.on('end', function(){
// 		file.end();
// 		console.log(fileName + " downloaded to " + UPLOAD_DIR);
// 	});
//
// 	file.on('finish', function(){
// 		console.log("FINISHED!");
// 		file.close(cb);
// 	});
//
// 	file.on('error', function(err){
// 		fs.unlink(UPLOAD_DIR + fileName);
// 		if (cb){
// 			cb(err);
// 		}
// 	});
// 	// when the child process exits, check if there were any errors
// 	wget.on('exit', function(code){
// 		if (code !== 0){
// 			cb("Failed: " + code);
// 		}
// 	});
//
// 	wget.stderr.setEncoding('utf8');
//
// 	wget.stderr.on('data', function(chunk){
// 		console.log(chunk.trim());
// 	});
// }


function downloadFilecURL(socket, urls, cb){

	console.log("Download file from cURL function called...");

	var curlArgs = ['-#'];

	console.log(urls);

	urls.forEach(function(item) {

		// extract filename
		var fileName = UPLOAD_DIR + url.parse(item).pathname.split("/").pop();

		// create an instance of a writeable stream
		// var file = fs.createWriteStream(UPLOAD_DIR + fileName);


		// add url to scriptArgs
		curlArgs.push('-o', fileName, item);

	});

	// execute curl using child process
	var curl = spawn('curl', curlArgs);

	// add a a data event listener
	// curl.stdout.on('data', function(chunk){
	// 	file.write(chunk);
	// });

	// add an end event listener
	curl.stdout.on('end', function(){
		// file.end();
		console.log("download complete");
		prevChunk = 0;
	});

	// file.on('finish', function(){
	// 	console.log("FINISHED!");
	// 	file.close(cb);
	// });

	// file.on('error', function(err){
	// 	// fs.unlink(UPLOAD_DIR + fileName);
	// 	if (cb){
	// 		cb(err);
	// 	}
	// });
	// when the child process exits, check if there were any errors
	curl.on('exit', function(code){
		if (code !== 0){
			cb("Failed: " + code);
		}
	});

	curl.stderr.setEncoding('utf8');

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
    form.on("fileBegin", function (name, file) {
        console.log("File type = " + file.type);
        console.log("File name = " + file.name);
    });

    // every time a single file has been uploaded successfully
    // rename it to it's original name
    form.on("file", function (field, file) {
    	console.log("File: " + file.path);
        fs.rename(file.path, path.join(form.uploadDir, file.name));
    });

    // log any errors that occur
    form.on("error", function (err) {
        console.log("An error has occured: \n" + err);
    });

    // once all the files have been uploaded, send a response to the client
    form.on("end", function () {
        res.end("success");
    });

    // parse the incoming request containing the form data
    form.parse(req);
}


module.exports = router;