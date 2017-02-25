/**
 * Created by michaelhall on 24/2/17.
 */
var express  = require('express'),
    path     = require('path'),
    fs       = require('fs'),
    chokidar = require('chokidar'),
    router   = express.Router();

const exec = require('child_process').exec;

const SCRIPT_DIR = path.join(__dirname, '../public/data/');



/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('analysis');
});

// POST route
router.post('/', function(req, res, next){
    console.log("Post request received...");
    exec(SCRIPT_DIR + 'test.sh', function(err, stdout, stderr){
        if (err){
            console.log(err);
        } else {
            console.log(stdout);
            console.log(stderr);
            chokidar.watch(SCRIPT_DIR, {ignored: /(^|[\/\\])\../}).on('all', function(event, path){
                console.log(event, path);
            });
        }
    });
    // this runs before the stdout gets returned. If I want it to run last then I should use
    // execSync()
    console.log("I should be last");

});

module.exports = router;
