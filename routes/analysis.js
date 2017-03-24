/**
 * Created by michaelhall on 24/2/17.
 */
var io       = require('../app.js'),
    express  = require('express'),
    path     = require('path'),
    kill     = require('tree-kill'),
    fs       = require('fs'),
    chokidar = require('chokidar'),
    router   = express.Router(),
	middleware = require('../middleware/analysis');

const spawn = require('child_process').spawn;
const assert = require('assert');
const SCRIPT_DIR = path.join(__dirname, '../public/scripts/');


/* GET analysis page. */
router.get('/', function(req, res) {
    res.render('analysis');
});



// connecting to the websocket opened when the client clicks the get started button
io.of('/analysis').on('connection', function(socket){
	console.log("Socket connected on server side");
	var pathData;
    // EVENT LISTENERS ON THE WEBSOCKET THAT WILL INTERACT WITH THE CLIENT/USER

	socket.on('error', function(error) {
		if (error) console.log(error);
	});

	// this event contains the path the user entered for where their reads are located
	socket.on('paths', function(data) {
		// path information entered by client
		pathData = data;
	});

	// this event is triggered when the user clicks the start button to begin species typing
    socket.on('startAnalysis', function(){

    	var outputFilePath = path.join(pathData.pathForOutput, pathData.outputFile + '.log');
    	var outputFile = fs.createWriteStream(outputFilePath);
	    outputFile.write('[');

	    outputFile.on('close', function() {
	    	console.log("output file closed");
	    });

	    console.log("Starting species typing...");

	    var hasWritingStarted = false,
	        dataToWrite;

    	// check for a file extension
	    var fileExt = path.extname(pathData.pathToInput);
		if (!fileExt) { // client gave a path
			console.log("client gave a path");
			// call npReader
			const npReader = middleware.run_npReader(pathData);
			// call bwa. false can be omitted. this indicates bwa is not the starting point
			const bwa = middleware.run_bwa(pathData, false);
			// call species typing
			const speciesTyping = middleware.run_speciesTyping(pathData);

			npReader.on('error', function(error) {
				console.log('npReader process error:');
				console.log(error);
			});

			npReader.stdout.on('data', function(data) {
				bwa.stdin.write(data);
			});

			npReader.stderr.on('data', function(data) {
				// console.log("npReader stderr: " + data);
			});

			npReader.on('close', function(code) {
				if (code !== 0) console.log("npReader closed with code " + code);
				bwa.stdin.end();
				console.log('npReader closed...');
			});

			npReader.on('exit', function(code, signal) {
				if (code || signal) {
					console.log("npReader exited with code '" + code + "' and signal '" + signal + "'");
				} else {
					console.log("npReader exited...");
				}

			});

			bwa.on('exit', function(code, signal) {
				if (code || signal) {
					console.log("bwa exited with code '" + code + "' and signal '" + signal + "'");
				} else {
					console.log("bwa exited...");
				}
			});

			bwa.on('error', function(error) {
				console.log('bwa process error:');
				console.log(error);
			});

			bwa.stdout.on('data', function(data) {
				speciesTyping.stdin.write(data);
			});

			bwa.stderr.on('data', function(data) {
				// console.log('bwa stderr: ' + data);
			});

			bwa.on('close', function(code) {
				if (code !== 0) console.log(code);
				speciesTyping.stdin.end();
				console.log('bwa closed...');
			});

			// encode the stdout as a string rather than a Buffer
			speciesTyping.stdout.setEncoding('utf8');

			speciesTyping.on('error', function(error) {
				console.log('species typing process error:');
				console.log(error);
			});

			speciesTyping.on('exit', function(code, signal) {
				if (code || signal) {
					console.log("speciesTyping exited with code '" + code + "' and signal '" + signal + "'");
				} else {
					console.log("speciesTyping exited...");
				}
				if (!outputFile.closed) { endFile(outputFile); }
			});

			speciesTyping.stdout.on('data', function(data) {
				// parse output into JSON format and send to client
				var updatedResults = JSON.parse(data);
				socket.emit('stdout', updatedResults.data);

				// if this is the first time writing data, dont add a comma to the start
				if (hasWritingStarted){
					dataToWrite = ',' + data;
				} else {
					dataToWrite = data;
					hasWritingStarted = true;
				}

				//write data to file. written is how many bytes were written from string.
				if (!outputFile.closed) {
					outputFile.write(dataToWrite, function (error, written, string) {
						if (error) console.log(error);
					});
				}
			});

			speciesTyping.stderr.on('data', function(data) {
				// console.log('species typing stderr: ' + data);
			});

			speciesTyping.on('close', function(code) {
				if (code !== 0) console.log('species typing closed with exit code ' + code);
				console.log('species typing closed...');
				if (!outputFile.closed) { endFile(outputFile); }
			});

			socket.on('kill', function(){
				try {
					// processes.forEach(function (child) {
					// 	if (child.connected) { kill(child.pid); }
					// 	// if (child.connected) { child.kill(); }
					// });
					// if (!outputFile.closed) { endFile(outputFile); }
					socket.disconnect();
				}
				catch (e) {
					console.log("Catch error: ");
					console.log(e);
				}
			});

			var processes = [npReader, bwa, speciesTyping];


		} else if (['.fastq', '.fq'].indexOf(fileExt) > -1) { // extension is for fastq
			console.log("client gave a fastq file");

			// call bwa. true indicates analysis is starting from bwa
			const bwa = middleware.run_bwa(pathData, true);

			// call species typing
			const speciesTyping = middleware.run_speciesTyping(pathData);

		} else {
			throw "Invalid file extension: File extension must be '.fastq' or '.fq'";
		}

		socket.on('disconnect', function() {
			processes.forEach(function (child) {
				child.kill();
				// if (child.connected) { kill(child.pid); }
				// else { console.log(child.pid + " is not connected" ); }
				// if (child.connected) { child.kill(); }
			});
			if (!outputFile.closed) { endFile(outputFile); }
		});


       // call function which handles initiating the child process for species typing
        // and all of the socket events/emitters needed to send the stdout to the client
       // startSpeciesTyping(socket, pathData);

    });
});




function startSpeciesTyping(socket, pathData) {
    // flag to track when writing has started to allow correct formatting of file
    var hasWritingStarted = false,
        dataToWrite,
        scriptArgs = ['speciesTypingMac.sh', pathData.pathToInput, pathData.pathToVirus];

    socket.on('disconnect', function(){
        console.log("Socket disconnected");
        if (writeAnalysisFile.closed && !speciesTyping.connected){
            // write stream and CP are both closed.
        } else if (writeAnalysisFile.closed && speciesTyping.connected) {
            // write stream closed but CP open still.
	        onCloseOrKill(speciesTyping.pid, null);
        } else if (!writeAnalysisFile.closed && speciesTyping.connected) {
            // write stream and CP both open.
            onCloseOrKill(speciesTyping.pid, writeAnalysisFile);
        } else {
            // write stream open but CP is closed.
            onCloseOrKill(null, writeAnalysisFile);
        }
    });

    // kill child process and all it's children when stop button is clicked.
    socket.on('kill', function(){
        onCloseOrKill(speciesTyping.pid, writeAnalysisFile);
        // TODO - cause some type of redirection or dashboard to appear
    });

    var scriptOptions = {
        // this is the directory which the child process will be run on
        cwd: SCRIPT_DIR
    };

    // creating the child process
    const speciesTyping = spawn('sh', scriptArgs, scriptOptions);

	// open file for writing data to
	var writePath = pathData.outputFile;
	var writeAnalysisFile = fs.createWriteStream(writePath);
	writeAnalysisFile.write('[');

    // encode the stdout as a string rather than a Buffer
    speciesTyping.stdout.setEncoding('utf8');

    // handle error in trying to run spawn command
    speciesTyping.on('error', function(err){
        console.log("Spawn has error: " + err);
    });

    // handle STDERR coming from child process
    speciesTyping.stderr.on('data', function(chunk){
        // console.log("STDERR: " + chunk);
    });

    // handle STDOUT coming from child process. This should be the species typing output
    speciesTyping.stdout.on('data', function(chunk){
        console.log("stdout received...");
        // parse chunk into JSON format
        var info = JSON.parse(chunk);

        // send chunk to client-side
        socket.emit('stdout', info.data);

        // if this is the first time writing data, dont add a comma to the start
        if (hasWritingStarted){
            dataToWrite = ',' + chunk;
        } else {
            dataToWrite = chunk;
            hasWritingStarted = true;
        }

        // write chunk to file
        writeAnalysisFile.write(dataToWrite, function(err, written, string){
           if(err){
               console.log(err);
           }
        });
    });

    speciesTyping.on('close', function(code){
        if (code){
            console.log("Process exited with code " + code);
        } else {
            console.log("Child process is closed/killed");
        }
    });
}


function onCloseOrKill(pid, wStream){
    // kill/close the child process
    if (pid) {
	    kill(pid, 'SIGTERM', function (err) {
		    if (err) {
			    console.log(err);
		    }
	    });
    }

	// close the writable stream
    if (wStream) {
	    wStream.end(']', function () {
		    console.log("The log file has been closed.");
	    });
    }
}


function endFile(wStream) {
	wStream.end(']', function () {
		console.log("The log file has been closed.");
	});
}


module.exports = router;