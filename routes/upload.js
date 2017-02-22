var express = require("express");
var router = express.Router();
var formidable = require("formidable"); // parses incoming form data (uploaded files)
var fs = require("fs"); // used to rename file uploads
var path = require('path');


// GET upload page
router.get("/", function(req, res){
	res.render("upload");
});

// POST uploading file
router.post("/", function(req, res){
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
	form.uploadDir = path.join(__dirname, "../uploads");

	// Make sure file type is correct
	form.on("fileBegin", function(name, file){
		// TODO add error catch incase user uploads something other than FASTQ
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
	form.parse(req);
});

module.exports = router;