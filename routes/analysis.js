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
// const VIRUS_DB = path.join(__dirname, '../public/data/virusDB/');

// require middleware with donut chart function
// var chart = require('../middleware/donut.js');

/* GET home page. */
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
    // TODO - remove all of the analysis from the post request

    // kill child process and all it's children when stop button is clicked.
    socket.on('kill', function(){
        kill(speciesTyping.pid);
    });

    var scriptOptions = {
        // this is the directory which the child process will be run on
        cwd: SCRIPT_DIR
    };

    // creating the child process
    const speciesTyping = spawn('sh', scriptArgs, scriptOptions);

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
        console.log("STDOUT: " + chunk);
        // var info = parseSpecTypingResults(chunk);
        var info = JSON.parse(chunk);

        // parse the species label if it is longer than 30 characters
        // info.data.forEach(function(entry){
        // 	if(entry.species.length > 30){
        // 		entry.species = entry.species.substr(0, 27) + "...";
        // 	}
        // });

        socket.emit('stdout', info.data);
    });

    speciesTyping.on('close', function(code){
        if (code !== 0){
            console.log("Process exited with code " + code);
        }
        console.log("Child process has been closed.");
    });
}



module.exports = router;