/**
 * Created by michaelhall on 24/2/17.
 */
var express  = require('express'),
    path     = require('path'),
    fs       = require('fs'),
    chokidar = require('chokidar'),
    router   = express.Router();

const exec = require('child_process').exec;
const spawn = require('child_process').spawn;

const SCRIPT_DIR = path.join(__dirname, '../public/data/japsaTesting/');
const VIRUS_DB = path.join(__dirname, '../public/data/virusDB/');
// command to run species typing
const RUN_ST = SCRIPT_DIR + "speciesTypingMac.sh " + SCRIPT_DIR + "testZika/ " + VIRUS_DB;



/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('analysis');
});

// POST route
// router.post('/', function(req, res, next){
//     console.log("Post request received...");
//     spawn(RUN_ST, function(err, stdout, stderr){
//         if (err){
//             console.log("Err: " + err);
//         } else {
//         	console.log("No errors...");
//             console.log("STDOUT: " + stdout);
//             console.log("STDERR: " + stderr);
//             chokidar.watch(SCRIPT_DIR, {ignored: /(^|[\/\\])\../}).on('all', function(event, path){
//                 console.log(event, path);
//             });
//         }
//     });
// });

router.post('/', function(req, res){
	console.log("Post request received...");

	// arguments (in order) to be passed to the child process
	var scriptArgs = ['speciesTypingMac.sh', 'testZika/', '../virusDB/'];

	var scriptOptions = {
		// this is the directory which the child process will be run on
		cwd: SCRIPT_DIR
	};

	// creating the child process
	const speciesTyping = spawn('sh', scriptArgs, scriptOptions);

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
		parseSpecTypingResults(chunk);
	});

	speciesTyping.on('close', function(code){
		if (code !== 0){
			console.log("Process exited with code " + code);
		}
	});
});


// function to parse species typing output
function parseSpecTypingResults(stdout){
	if (stdout.startsWith("time")){
		console.log("Header detected");

	}
}


module.exports = router;
