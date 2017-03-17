/**
 * Created by m.hall on 17/3/17.
 */

module.exports = function() {
	const fs = require('fs'),
	      path = require('path'),
	      readline = require('readline'),
	      jsonfile = require('jsonfile');

	var fileLoc = path.join(__dirname, '../../organism_info'),
	    speciesList = [];

	const rl = readline.createInterface({
		input: fs.createReadStream(fileLoc + '.tsv')
	});

	rl.on('line', function(line) {
		if (!(line.startsWith('#') || line.startsWith('taxid'))) {
			speciesList.push({
				taxid: line.trim().split('\t')[0],
				orgName: line.trim().split('\t')[2],
				strain: line.trim().split('\t').pop()
			});
		}
	});

	rl.on('close', function() {
		console.log(speciesList);
		return speciesList;
	});
};