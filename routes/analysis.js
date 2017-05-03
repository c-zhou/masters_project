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
    hasSTWritingStarted = false, // has species typing writing started
    hasRPWritingStarted = false, // has resistance profiling writing started
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
	console.log("Starting analysis at " + new Date());
	hasSTWritingStarted = false;
	hasRPWritingStarted = false;
	processes = [];

	var outputFilePath    = path.join(pathData.pathForOutput, pathData.outputFile + '.log'),
	    outputFile        = fs.createWriteStream(outputFilePath);
	outputFile.write('[');


	outputFile.on('close', function() {
		console.log("output file closed at " + new Date());
	});

	if (pathData.pathToResDB) {
		var outputResFilePath = path.join(pathData.pathForOutput, pathData.outputFile +
			    '_resistance.log'),
		    outputResFile     = fs.createWriteStream(outputResFilePath);
		outputResFile.write('[');
		outputResFile.on('close', function() {
			console.log("resistance output file closed at " + new Date());
		});
	}

	// check for a file extension
	var fileExt = path.extname(pathData.pathToInput);
	if (!fileExt) { // client gave a path
		// call npReader
		const npReader = middleware.run_npReader(pathData);
		// call bwa. false can be omitted. this indicates bwa is not the starting point
		const bwa = middleware.run_bwa(pathData, 'ST', false);
		// call species typing
		const speciesTyping = middleware.run_speciesTyping(pathData);

		processes.push(npReader, bwa, speciesTyping);

		// if user wants resistance profiling
		if (pathData.resistanceProfiling) {
			console.log("resistance profiling requested...");

			// spawn a bwa instance based on resistance database
			const bwaRes = middleware.run_bwa(pathData, 'RP', false);
			const resProfiling = middleware.run_resProfiling(pathData);
			npReaderListeners(npReader, [bwa, bwaRes]);
			bwaListeners(bwaRes, resProfiling);
			resProfilingListeners(resProfiling, outputResFile, socket);

			//=====================================
			// used for logging resistance profiling's bwa instance for stderr and stdout
			// var bwaResStderrLog = fs.createWriteStream(path.join(pathData.pathForOutput, 'bwaRes.stderr.log')),
			//     bwaResStdoutLog = fs.createWriteStream(path.join(pathData.pathForOutput, 'bwaRes.stdout.log'));
			// bwaRes.stderr.on('data', function (data) {
			// 	bwaResStderrLog.write(data);
			// });
			// bwaRes.stdout.on('data', function (data) {
			// 	bwaResStdoutLog.write(data);
			// });
			//=====================================

			processes.push(bwaRes, resProfiling);
		} else {
			npReaderListeners(npReader, [bwa]);
		}

		bwaListeners(bwa, speciesTyping);
		speciesTypingListeners(speciesTyping, outputFile, socket);

	} else if (['.fastq', '.fq'].indexOf(fileExt) > -1) { // client gave fastq
		// call bwa. true indicates analysis is starting from bwa and fastq file will be
		// given to bwa as it's input
		const bwa = middleware.run_bwa(pathData, 'ST', true);
		// call species typing
		const speciesTyping = middleware.run_speciesTyping(pathData);

		processes.push(bwa, speciesTyping);

		// if user wants resistance profiling
		if (pathData.resistanceProfiling) {
			console.log("resistance profiling requested...");

			// spawn a bwa instance based on resistance database
			const bwaRes = middleware.run_bwa(pathData, 'RP', true);
			const resProfiling = middleware.run_resProfiling(pathData);
			bwaListeners(bwaRes, resProfiling);
			resProfilingListeners(resProfiling, outputResFile, socket);

			//=====================================
			// used for logging resistance profiling's bwa instance for stderr and stdout
			// var bwaResStderrLog = fs.createWriteStream(path.join(pathData.pathForOutput, 'bwaRes.stderr.log')),
			//     bwaResStdoutLog = fs.createWriteStream(path.join(pathData.pathForOutput, 'bwaRes.stdout.log'));
			// bwaRes.stderr.on('data', function (data) {
			// 	bwaResStderrLog.write(data);
			// });
			// bwaRes.stdout.on('data', function (data) {
			// 	bwaResStdoutLog.write(data);
			// });
			//=====================================

			processes.push(bwaRes, resProfiling);
		}

		bwaListeners(bwa, speciesTyping);
		speciesTypingListeners(speciesTyping, outputFile, socket);

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
		bwa.forEach(function(proc) { proc.stdin.write(data); });

		// bwa.stdin.write(data);
	});

	npReader.on('close', function(code, signal) {
		if (code || signal) console.log("npReader closed " + code + " " + signal + ' at ' + new Date());
		// bwa.stdin.end();
		bwa.forEach(function(proc) { proc.stdin.end(); });
	});
}

function bwaListeners(bwa, japsaProc) {
	// bwa.stderr.setEncoding('utf8');

	bwa.on('error', function(error) {
		console.log('bwa error: ');
		console.log(error);
	});

	// bwa.stderr.on('data', function(data) {
	// 	console.log("bwa stderr: ");
	// 	console.log(data.toString());
	// });


	bwa.stdout.on('data', function(data) {
		// console.log(data.toString());
		japsaProc.stdin.write(data);
	});

	bwa.on('close', function(code, signal) {
		if (code || signal) console.log("bwa closed " + code + " " + signal + ' at ' + new Date());
		japsaProc.stdin.end();
	});

	bwa.on('exit', function(code, signal) {
		if (code || signal) console.log("bwa exited " + code + " " + signal + ' at ' + new Date());
	});
}

function speciesTypingListeners(speciesTyping, outputFile, socket) {
	// encode the stdout as a string rather than a Buffer
	speciesTyping.stdout.setEncoding('utf8');
	speciesTyping.stderr.setEncoding('utf8');

	speciesTyping.on('error', function(error) {
		console.log('species typing process error:');
		console.log(error);
	});

	// speciesTyping.stderr.on('data', function(data) {
	// 	console.log('st stderr:');
	// 	console.log(data);
	// });

	speciesTyping.stdout.on('data', function(data) {
		var dataToWrite;
		// parse output into JSON format and send to client
		var recentResults = JSON.parse(data);
		socket.emit('stdout', recentResults.data);

		// if this is the first time writing data, dont add a comma to the start
		if (hasSTWritingStarted) { dataToWrite = ',' + data; }
		else {
			dataToWrite = data;
			hasSTWritingStarted = true;
		}

		//write data to file. written is how many bytes were written from string.
		if (!outputFile.closed && hasSTWritingStarted) {
			outputFile.write(dataToWrite, function (error, written, string) {
				if (error) console.log(error);
			});
		}
	});

	speciesTyping.on('close', function(code, signal) {
		if (code || signal) console.log("speciesTyping closed " + code + " " + signal + ' at ' + new Date());
		hasSTWritingStarted = false;
		// close output file is not already close and write closing bracket
		if (!outputFile.closed) { endFile(outputFile); }
	});

	speciesTyping.on('exit', function(code, signal) {
		if (code || signal) console.log("speciesTyping exited " + code + " " + signal + ' at ' + new Date());
	});
}

function resProfilingListeners(resProfiling, outputFile, socket) {
	// encode the stdout as a string rather than a Buffer
	resProfiling.stdout.setEncoding('utf8');

	resProfiling.on('error', function(error) {
		console.log('resistance profiling process error:');
		console.log(error);
	});

	resProfiling.stdout.on('data', function(data) {
		var dataToWrite;
		// parse output into JSON format and send to client
		// var recentResults = JSON.parse(data);
		// console.log("Resistance profiling stdout:");
		// console.log(data);

		var entries = data.split('\n').filter(function(line) { return !line.startsWith('#') && line });

		console.log(entries);


		socket.emit('resistance', entries);

		// if this is the first time writing data, dont add a comma to the start
		if (hasRPWritingStarted) { dataToWrite = ',' + data; }
		else {
			dataToWrite = data;
			hasRPWritingStarted = true;
		}

		//write data to file. written is how many bytes were written from string.
		if (!outputFile.closed && hasRPWritingStarted) {
			outputFile.write(dataToWrite, function (error, written, string) {
				if (error) console.log(error);
			});
		}
	});

	// resProfiling.stderr.on('data', function(data) {
	// 	console.log("resistance profiling stderr:");
	// 	console.log(data.toString());
	// });

	resProfiling.on('close', function(code, signal) {
		if (code || signal) console.log("resistance profiling closed " + code + " " + signal + ' at ' + new Date());
		hasRPWritingStarted = false;
		// close output file is not already close and write closing bracket
		if (!outputFile.closed) { endFile(outputFile); }
	});

	resProfiling.on('exit', function (code, signal) {
		if (code || signal) console.log("resistance profiling closed " + code + " " + signal + ' at ' + new Date());
	})
}

function endFile(wStream) {
	wStream.end(']', function () {
		console.log("The log file has been closed at " + new Date());
	});
}


module.exports = router;