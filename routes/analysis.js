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
const SCRIPT_DIR = path.join(__dirname, '../public/data/japsaTesting/');


/* GET analysis page. */
router.get('/', function(req, res) {
    res.render('analysis');
});



// connecting to the websocket opened when the client clicks the get started button
io.of('/analysis').on('connection', function(socket){
	var scriptArgs;
    // EVENT LISTENERS ON THE WEBSOCKET THAT WILL INTERACT WITH THE CLIENT/USER

	// this event contains the path the user entered for where their reads are located
	socket.on('paths', function(data) {
		// arguments (in order) to be passed to the child process
		scriptArgs = ['speciesTypingMac.sh', data.pathToReads, data.pathToVirus];
	});

	// this event is triggered when the user clicks the start button to begin species typing
    socket.on('startAnalysis', function(){
       console.log("Starting species typing...");

       // call function which handles initiating the child process for species typing
        // and all of the socket events/emitters needed to send the stdout to the client
       startSpeciesTyping(socket, scriptArgs);

    });
});


function startSpeciesTyping(socket, scriptArgs) {
    // flag to track when writing has started to allow correct formatting of file
    var hasWritingStarted = false,
        dataToWrite;

    socket.on('disconnect', function(){
        // TODO - run test to see if CP and stream are already closed
	    kill(speciesTyping.pid, 'SIGTERM', function(err){
	        if(err){
	            console.log(err);
            } else {
	            console.log("Child process killed.");
            }
        });

	    // close the writable stream
	    writeAnalysisFile.end(']', function(){
		    console.log("The log file has been closed.");
	    });
    });

    // kill child process and all it's children when stop button is clicked.
    socket.on('kill', function(){
        kill(speciesTyping.pid, 'SIGTERM', function(err){
            if(err){
                console.log(err);
            } else {
	            console.log("Child process killed.");
            }
        });

        // close the writable stream
        writeAnalysisFile.end(']', function(){
            console.log("The log file has been closed.");
        });
        // TODO - cause some type of redirection or dashboard to appear
    });

    var scriptOptions = {
        // this is the directory which the child process will be run on
        cwd: SCRIPT_DIR
    };

    // creating the child process
    const speciesTyping = spawn('sh', scriptArgs, scriptOptions);

	// open file for writing data to
	var writePath = SCRIPT_DIR + 'speciesTyping' + speciesTyping.pid + '.log';
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
        }
        console.log("Child process has been closed.");
    });
}



module.exports = router;