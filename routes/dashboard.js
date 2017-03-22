/**
 * Created by m.hall on 17/3/17.
 */
const fs          = require('fs'),
      path        = require('path'),
      UPLOAD_DIR  = path.join(__dirname, "../../uploads/");

var io         = require('../app.js'),
    url        = require('url'),
    d3         = require('d3-collection'),
    http       = require('http'),
    express    = require('express'),
    router     = express.Router(),
	sankeyParser = require('../middleware/sankeyParser');

var sankeyFile = 'public/data/sankey.tsv';

var diagramParams = {
	containerId: 'chart'
};





router.get('/', function(req, res) {
	sankeyParser.tsvParser(sankeyFile, function(data) {
		diagramParams.data = sankeyParser.graphParser(data);
		res.render('dashboard', { fixtureData: JSON.stringify(diagramParams) });
	});

});



module.exports = router;