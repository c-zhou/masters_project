/**
 * Created by m.hall on 17/3/17.
 */
const path        = require('path'),
      spawn       = require('child_process').spawn,
      UPLOAD_DIR  = path.join(__dirname, "../../uploads/");

var io         = require('../app.js'),
    fs         = require('fs'), // used to rename file uploads
    qs         = require('qs'), // package to parse serialized form data
    db         = require(path.join(path.dirname(require.main.filename), '../db.json')),
    url        = require('url'),
    http       = require('http'),
    kill       = require('tree-kill'),
    express    = require('express'),
    router     = express.Router(),
    jsonfile   = require('jsonfile'),
    Metadata   = require('../models/metadata'), // constructor for database object
	formidable = require('formidable'); // parses incoming form data (uploaded files)





router.get('/', function(req, res) {
	res.render('dashboard');
});






module.exports = router;