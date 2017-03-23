/**
 * Created by michaelhall on 24/2/17.
 */
var io       = require('../app.js'),
    express  = require('express'),
    path     = require('path'),
    kill     = require('tree-kill'),
    fs       = require('fs'),
    chokidar = require('chokidar'),
    router   = express.Router();

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

	// this event contains the path the user entered for where their reads are located
	socket.on('paths', function(data) {
		// path information entered by client
		pathData = data;
	});

	// this event is triggered when the user clicks the start button to begin species typing
    socket.on('startAnalysis', function(){

	    console.log("Starting species typing...");

    	// run logic to see which modules need to be run
	    var checkReads = path.extname(pathData.pathToReads);
		console.log(checkReads);


       // call function which handles initiating the child process for species typing
        // and all of the socket events/emitters needed to send the stdout to the client
       // startSpeciesTyping(socket, pathData);

    });
});

// child process constructor for npReader
function run_npReader(pathData) {
	var npReaderArgs = [
		    '--realtime', // run the program in real-time mode
		    '--fail', // get sequence reads from the fail folder
		    '--folder ' + pathData.pathToReads, // the folder containing base-called reads
		    '--output -' // output to stdout (this is default but included for clarity)
	    ],
	    npReaderOptions = {
		    cwd: pathData.pathForOutput, // where to run the process
		    stdio: ['pipe', 'pipe', 'pipe'] // stdin stdout stderr types (could use 'ignore')
	    };

	return spawn('jsa.np.npreader', npReaderArgs, npReaderOptions);
}

// child process constructor for bwa
function run_bwa(pathData) {
	var bwaArgs = [
		    '-t 4', // number of threads
		    '-k 11', // min. seed length
		    '-W 20', // discard a chain if seeded bases shorter than INT
		    '-r 10', // look for internal seeds inside a seed longer than {-k} * FLOAT
		    '-A 1', // mismatch score
		    '-B 1', // penalty for mismatch - optimised for np
		    '-O 1', // gap open penalty - optimised for nanopore
		    '-E 1', // gap extension penalty
		    '-L 0', // penalty for 5'- and 3'-end clipping - optimised for np
		    '-Y', // use soft clipping for supplementary alignments
		    '-K 10000', // buffer length in bp (not documented)
		    path.join(pathData.pathToVirus, 'genomeDB.fasta'), // ref sequence/db
		    '-' // read file from stdin
	    ],
	    bwaOptions = {
		    cwd: pathData.pathForOutput, // where to run the process
		    stdio: ['pipe', 'pipe', 'pipe'] // stdin stdout stderr types (could use 'ignore')
	    };

	return spawn('bwa mem', bwaArgs, bwaOptions);
}

// child process constructor for real-time species typing
function run_speciesTyping(pathData) {
	var specTypingArgs = [
		    '-web', // output is in JSON format for use in the web app viz
		    '-bam -', // read BAM from stdin
		    '-index ' + path.join(pathData.pathToVirus, 'speciesIndex'), // index file
		    '--read 100', // min. number of reads between analysis
		    '-time 3', // min. number of secs between analysis
		    '-out -' // output to stdout
	    ],
	    specTypingOptions = {
		    cwd: pathData.pathForOutput, // where to run the process
		    stdio: ['pipe', 'pipe', 'pipe'] // stdin stdout stderr types (could use 'ignore')
	    };

	return spawn('jsa.np.rtSpeciesTyping', specTypingArgs, specTypingOptions);
}


function startSpeciesTyping(socket, pathData) {
    // flag to track when writing has started to allow correct formatting of file
    var hasWritingStarted = false,
        dataToWrite,
        scriptArgs = ['speciesTypingMac.sh', pathData.pathToReads, pathData.pathToVirus];

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



module.exports = router;