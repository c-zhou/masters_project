/**
 * Created by m.hall on 22/3/17.
 */

const fs = require('fs'),
	  readline = require('readline');

var d3 = require('d3');


// function that returns an object with keys as the headers of the tsv file and values
// for those headers in an array
var parser = function(fileName, callback) {

	// read from input readable stream, but one line at a time
	const rl = readline.createInterface({
		      input: fs.createReadStream(fileName)
	      });

	// regex to split on 1 or more spaces
	const re = /\s+/;

	var data = [],
	    keys = ["sampleID", "sequence", "gene_start", "gene_end"];
	    lines = 0; // track line numbers for determining head etc.

	// reading file one line at a time
	rl.on('line', function(line) {
		var row = line.split(re);

		// get the boundaries for the gene
		var gene_start = row[1].indexOf("|"),
			gene_end   = row[1].lastIndexOf("|");

		// make sure two unique gene boundaries have been detected
		console.assert(gene_end !== gene_start, "Unexpected gene boundaries");

		// construct the data entry for this row
		var obj = {
			sampleID: row[0],
			sequence: row[1].replace(/|/gi, ''),
			gene_start: gene_start + 1,
			gene_end: gene_end - 1
		};

        console.log(obj);

		data.push(obj);
		// if (lines === 0) { // headers/keys
		// 	keys = row;
		// 	keys.forEach(function(currentValue) {
		// 		data[currentValue] = []; // create key in object for each header
		// 	});
		// } else {
		// 	row.forEach(function(currentValue, i) {
		// 		data[keys[i]].push(currentValue); // push values into appropriate key array
		// 	});
		// }
		// lines++;
	});

	rl.on('close', function() {
		return callback(data); // when done, run the given callback function on the data
	});
};

module.exports = parser;