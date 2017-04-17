/**
 * Created by m.hall on 17/3/17.
 */
var express    = require('express'),
    router     = express.Router(),
	msaParser = require('../middleware/msaParser');

var testFile = 'public/data/sankey.tsv';

router.get('/', function(req, res) {
	msaParser(testFile, function(data) {
		var diagramData = sankeyParser.graphParser(data);
		// one parsing is complete, render response
		res.render('dashboard', { fixtureData: JSON.stringify(diagramData) });
		// have to use JSON.stringify otherwise ejs only sees it as [object Object]
	});
});



module.exports = router;