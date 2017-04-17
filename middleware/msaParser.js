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

	var data = {
            sampleID: [],
            sequence: [],
            gene_start: null,
            gene_end: null
		},
	    lines = 0; // track line numbers for determining head etc.

	// reading file one line at a time
	rl.on('line', function(line) {
		var row = line.split(re);
		console.log(row);
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