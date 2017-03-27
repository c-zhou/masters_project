var io         = require('../app.js'),
    express    = require('express'),
    path       = require('path'),
    kill       = require('tree-kill'),
    fs         = require('fs'),
    router     = express.Router(),
	middleware = require('../middleware/analysis');

// GET analysis view
router.get('/', function(req, res) {
    res.render('analysis');
});

var pathData,
    hasWritingStarted = false,
    processes         = [];

// connecting to the websocket opened when the client clicks the get started button
io.of('/analysis').on('connection', function(socket){
	console.log("Socket connected on server side");

	socket.on('error', function(error) {
		if (error) console.log(error);
	});

	socket.on('paths', function(data) {
		// path information entered by client
		pathData = data;
	});

	// when user presses stop button, receive kill message from client and close socket
	socket.on('kill', function(){
		socket.disconnect();
	});

    socket.on('startAnalysis', function(){
	    runAnalysis(socket);
    });
});


// =====================================================================================
// FUNCTIONS
// =====================================================================================

function runAnalysis(socket){
	console.log("Starting species typing...");
	hasWritingStarted = false;
	processes = [];

	var outputFilePath = path.join(pathData.pathForOutput, pathData.outputFile + '.log'),
	    outputFile     = fs.createWriteStream(outputFilePath);
	outputFile.write('[');

	outputFile.on('close', function() {
		console.log("output file closed");
	});

	// check for a file extension
	var fileExt = path.extname(pathData.pathToInput);
	if (!fileExt) { // client gave a path
		// call npReader
		const npReader = middleware.run_npReader(pathData);
		// call bwa. false can be omitted. this indicates bwa is not the starting point
		const bwa = middleware.run_bwa(pathData, false);
		// call species typing
		const speciesTyping = middleware.run_speciesTyping(pathData);

		npReaderListeners(npReader, bwa);
		bwaListeners(bwa, speciesTyping);
		speciesTypingListeners(speciesTyping, outputFile, socket);

		processes.push(npReader, bwa, speciesTyping);

	} else if (['.fastq', '.fq'].indexOf(fileExt) > -1) { // client gave fastq
		// call bwa. true indicates analysis is starting from bwa and fastq file will be
		// given to bwa as it's input
		const bwa = middleware.run_bwa(pathData, true);
		// call species typing
		const speciesTyping = middleware.run_speciesTyping(pathData);

		bwaListeners(bwa, speciesTyping);
		speciesTypingListeners(speciesTyping, outputFile, socket);

		processes.push(bwa, speciesTyping);

	} else {
		throw "Invalid file extension: File extension must be '.fastq' or '.fq'";
	}

	socket.on('disconnect', function() {
		kill(processes[0].pid);
		if (!outputFile.closed) { endFile(outputFile); }
	});
}


function npReaderListeners(npReader, bwa){
	npReader.on('error', function(error) {
		console.log('npReader process error:');
		console.log(error);
	});

	npReader.stdout.on('data', function(data) {
		bwa.stdin.write(data);
	});

	npReader.on('close', function(code, signal) {
		if (code || signal) console.log("npReader closed " + code + " " + signal);
		bwa.stdin.end();
	});
}

function bwaListeners(bwa, speciesTyping) {
	bwa.on('error', function(error) {
		console.log('bwa process error:');
		console.log(error);
	});

	bwa.stdout.on('data', function(data) {
		speciesTyping.stdin.write(data);
	});

	bwa.on('close', function(code, signal) {
		if (code || signal) console.log("bwa closed " + code + " " + signal);
		speciesTyping.stdin.end();
	});
}

function speciesTypingListeners(speciesTyping, outputFile, socket) {
	// encode the stdout as a string rather than a Buffer
	speciesTyping.stdout.setEncoding('utf8');

	speciesTyping.on('error', function(error) {
		console.log('species typing process error:');
		console.log(error);
	});

	speciesTyping.stdout.on('data', function(data) {
		var dataToWrite;
		// parse output into JSON format and send to client
		var recentResults = JSON.parse(data);
		socket.emit('stdout', recentResults.data);

		// if this is the first time writing data, dont add a comma to the start
		if (hasWritingStarted) { dataToWrite = ',' + data; }
		else {
			dataToWrite = data;
			hasWritingStarted = true;
		}

		//write data to file. written is how many bytes were written from string.
		if (!outputFile.closed && hasWritingStarted) {
			outputFile.write(dataToWrite, function (error, written, string) {
				if (error) console.log(error);
			});
		}
	});

	speciesTyping.on('close', function(code, signal) {
		if (code || signal) console.log("speciesTyping closed " + code + " " + signal);
		hasWritingStarted = false;
		// close output file is not already close and write closing bracket
		if (!outputFile.closed) { endFile(outputFile); }
	});
}

function endFile(wStream) {
	wStream.end(']', function () {
		console.log("The log file has been closed.");
	});
}


module.exports = router;