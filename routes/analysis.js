/**
 * Created by michaelhall on 24/2/17.
 */
var express  = require('express'),
    path     = require('path'),
    kill     = require('tree-kill'),
    fs       = require('fs'),
    chokidar = require('chokidar'),
    router   = express.Router();

const spawn = require('child_process').spawn;
const assert = require('assert');

const SCRIPT_DIR = path.join(__dirname, '../public/data/japsaTesting/');
const VIRUS_DB = path.join(__dirname, '../public/data/virusDB/');
// command to run species typing
const RUN_ST = SCRIPT_DIR + "speciesTypingMac.sh " + SCRIPT_DIR + "testZika/ " + VIRUS_DB;

// require middleware with donut chart function
// var chart = require('../middleware/donut.js');



/* GET home page. */
router.get('/', function(req, res) {
    res.render('analysis');
});






router.post('/start', function(req, res){
    console.log("");
    console.log("");
    console.log("Starting analysis...");

    // access the socket passed from the server
    var socket = req.app.get('socketio');


    // run start script
    startSpeciesTyping(socket);

    var path = req.query.readsPath;

    console.log('');
    console.log(req.query);
	console.log('PATH IS', path);
});


// on stop, res.send(JSON of last entry - later)


router.post('/stop', function(req, res){
    // stop socket
    socket.emit('kill');
});


function startSpeciesTyping(socket) {

    // TODO - remove all of the analysis from the post request

    socket.on('love', function(msg){
        console.log("Love message received on analysis route...");
    });

    // kill child process and all it's children when stop button is clicked.
    socket.on('kill', function(){
        kill(speciesTyping.pid);
    });

    // arguments (in order) to be passed to the child process
    var scriptArgs = ['speciesTypingMac.sh', 'testZika/', '../virusDB/'];

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



var headings = [
	"time", "step", "reads", "bases", "species", "prob", "err", "tAligned", "sAligned"
];



module.exports = router;



/* GET home page. */
router.get('/:userPath', function(req, res, next) {
    res.render('analysis', {info: null});
});






// OLD functions for parsing species typing before we changed the output of the japsa program
// keeping these here for now incase their need arises again.
// function to parse species typing output
// function parseSpecTypingResults(stdout){
// 	var lines = stdout.split("\n");
//
// 	if (stdout.startsWith("time")) {
// 		// removes the header line
// 		lines.splice(0, 1);
// 	}
// 	// function to check if any elements in the array are empty. i.e after split on \n
// 	var isNotEmpty = function(item){ return (/\S/.test(item)); };
//
// 	// filter out empty elements and then parse each line into an object
// 	var resultsArr =  lines.filter(isNotEmpty).map(lineParser);
// 	console.log(resultsArr);
// 	return resultsArr;
// }
//
//
//
// // parses a line into the required object
// function lineParser(line){
// 	var results = line.split("\t");
//
// 	// make sure the results have the same number of fields as the headings
// 	var assertError = "Number of fields returned from Species-typing does not match the " +
// 		"required number! This is the line: " + results;
// 	assert.strictEqual(results.length, headings.length, assertError);
//
// 	var output = {};
//
// 	// add headings as keys and associate their values from the parsed line
// 	for (var i = 0; i < headings.length; i++){
// 		if (!isNaN(results[i])){
// 			output[headings[i]] = +results[i];
// 			if (headings[i] === "prob"){
// 				// TODO - bug with some numbers not rounding properly i.e 99.770000000000001
// 				output[headings[i]] = Math.round(output[headings[i]] * 10000) / 10000;
// 			}
// 		} else {
// 			if (headings[i] === "species"){
// 				if (results[i].length > 30) {
// 					results[i] = results[i].split(" ").slice(0, 4).join(" ");
// 				}
// 			}
// 			output[headings[i]] = results[i];
// 		}
// 	}
// 	// console.log(output);
// 	return output;
// }
