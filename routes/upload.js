var express    = require('express'),
    router     = express.Router(),
    formidable = require('formidable'), // parses incoming form data (uploaded files)
	fs         = require('fs'), // used to rename file uploads
	path       = require('path'),
	url        = require('url'),
    http       = require('http'),
	https      = require('https'),
    exec       = require('child_process').exec,
    spawn      = require('child_process').spawn;


var UPLOAD_DIR = path.join(__dirname, "../uploads/");

// GET upload page
router.get("/", function(req, res){
	res.render("upload");
});

// POST uploading file
router.post("/", function(req, res){
	// check if the post request has come from the local file upload or URL upload form
	// req.xhr A Boolean property that is true if the request’s X-Requested-With header field is
	// “XMLHttpRequest”, indicating that the request was issued by a client library such as jQuery.
	if (!req.xhr){
		// Getting to here indicates the user has requested to upload a file from a URL
		// set the path to the file, including the file's name
		var dest = UPLOAD_DIR + req.body.uploadURL.split("/").pop();

		// download the file at the URL
		download(req.body.uploadURL, dest, function(err){
			// handle error
			if (err) {
				// TODO handle errors properly
				res.send(err.message);
			} else {
                // refresh the page once the file is complete
                res.redirect('/upload');
            }
		});
	} else {
        // Getting to here indicates that the user has requested to upload a local file
		// upload the file to the server
		getFile(req, res);
    }
});






// TODO add these functions into a middleware folder
// function for downloading from URL
var download = function(uploadURL, dest, cb){
	var supportedLibraries = {
		"http:": http,
		"https:": https
	};
	var parsed = url.parse(uploadURL);
	var lib = supportedLibraries[parsed.protocol || "http:"];
	var file = fs.createWriteStream(dest);
	var request = lib.get(uploadURL, function(response){
		response.pipe(file);
		file.on('finish', function(){
			// close() is async, call cb after close completes
			file.close(cb);
		})
			.on('error', function(err){
				// delete the file async
				fs.unlink(dest);
				if (cb) {
					cb(err.message);
                }
			});

	});
};

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

    // // sets encoding for incoming form fields
    // form.encoding = 'utf-8';
    //
    // // if you want to keep the original file extension
    // form.keepExtensions = true;
    //
    // // specify that we want to allow the user to upload multiple files in a single request
    // form.multiples = true;
    //
    // form.type = "multipart";
    //
    // // store all uploads in the /uploads directory
    // form.uploadDir = UPLOAD_DIR;

    // TODO add error catch incase user uploads something other than FASTQ
    // Make sure file type is correct
    // form.on("fileBegin", function (name, file) {
    //     // console.log("File type = " + file.type);
    //     // console.log("File name = " + file.name);
    // });

    // every time a single file has been uploaded successfully
    // rename it to it's original name
    form.on("file", function (field, file) {
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