var express    = require('express'),
    router     = express.Router(),
    formidable = require('formidable'), // parses incoming form data (uploaded files)
	fs         = require('fs'), // used to rename file uploads
	path       = require('path'),
	url        = require('url'),
    http       = require('http'),
    exec       = require('child_process').exec,
    spawn      = require('child_process').spawn;


var UPLOAD_DIR = path.join(__dirname, "../uploads/");

// GET upload page
router.get("/", function(req, res){
	res.render("upload");
});

// POST uploading file
router.post("/", function(req, res){
	console.log("Post request received...");
	// create an incoming form object
	var form = new formidable.IncomingForm();

	// sets encoding for incoming form fields
	form.encoding = 'utf-8';

	// if you want to keep the original file extension
	form.keepExtensions = true;

	// specify that we want to allow the user to upload multiple files in a single request
	form.multiples = true;

	form.type = "multipart";

	// store all uploads in the /uploads directory
	form.uploadDir = path.join(__dirname, UPLOAD_DIR);

	// Make sure file type is correct
	form.on("fileBegin", function(name, file){
		// TODO add error catch incase user uploads something other than FASTQ
		// console.log(file);
		console.log("File type = " + file.type);
		console.log("File name = " + file.name);

	});

	// every time a single file has been uploaded successfully
	// rename it to it's original name
	form.on("file", function(field, file){
		fs.rename(file.path, path.join(form.uploadDir, file.name));
	});

	// log any errors that occur
	form.on("error", function(err){
		console.log("An error has occured: \n" + err);
	});

	// once all the files have been uploaded, send a response to the client
	form.on("end", function(){
		res.end("success");
	});

	// parse the incoming request containing the form data
	form.parse(req, res, function(err, fields, files){
		console.log("Parsing...");
		if(fields.uploadURL){
			console.log("The URL is " + fields.uploadURL);
			downloadFile(fields.uploadURL);
		}
		if(files.uploadFile){
			console.log("You are uploading " + files.uploadFile.name);
		}
	});

});



// function to download from URL
function downloadFile(fileURL){
	var options = {
		host: url.parse(fileURL).host,
		port: 80,
		path: url.parse(fileURL).pathname
	};

	var fileName = options.path.split("/").pop();
	var writeFile = fs.createWriteStream(UPLOAD_DIR + fileName);
	console.log(UPLOAD_DIR + fileName);

	 var request = http.get(options, function(res){
		res.on('data', function(data){
			writeFile.write(data);
		})
			.on('end', function(){
				writeFile.end();
				console.log(fileName + " downloaded to " + UPLOAD_DIR);
			});
	});
}

module.exports = router;