/**
 * Created by m.hall on 17/3/17.
 */
var express    = require('express'),
    router     = express.Router(),
	msaParser = require('../middleware/msaParser');

// var testFile = 'public/data/greece_toy_data.txt';
var testFile = 'public/data/phoq_aln.dat';
// var testFile = 'public/data/phoq_aln.dat';

router.get('/', function(req, res) {
	msaParser(testFile, function(data) {
		res.render('dashboard', { fixtureData: JSON.stringify(data) });
		// have to use JSON.stringify otherwise ejs only sees it as [object Object]
	});
});



module.exports = router;