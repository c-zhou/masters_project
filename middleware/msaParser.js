/**
 * Created by m.hall on 22/3/17.
 */

const fs = require('fs'),
	  readline = require('readline');

// function that returns an object with keys as the headers of the tsv file and values
// for those headers in an array
var parser = function(fileName, callback) {

	// read from input readable stream, but one line at a time
	const rl = readline.createInterface({
		      input: fs.createReadStream(fileName)
	      });

	// regex to split on 1 or more spaces (includes tab characters)
	const re = /\s+/;

	var data = [];

	// reading file one line at a time
	rl.on('line', function(line) {
		console.log(rl.bytesRead);
		var row = line.split(re);

		// change any * characters to an indel (-)
        row[1] = row[1].replace(/\*/gi, "-");

		// get the boundaries for the gene
		var gene_start = row[1].indexOf("|"),
			gene_end   = row[1].lastIndexOf("|");

		// make sure two unique gene boundaries have been detected
		console.assert(gene_end !== gene_start, "Unexpected gene boundaries");

		// construct the data entry for this row
		var obj = {
			sampleID: row[0],
			sequence: row[1].replace(/\|/gi, '').split(''), // remove all (gi) |s from the sequence
			gene_start: gene_start + 1,
			gene_end: gene_end - 1
		};

		data.push(obj);
	});

	rl.on('close', function() {

		var tData = transform(data);

		return callback(tData); // when done, run the given callback function on the data
	});
};

function transform(data) {
    var mapping = {}, // hold mapping from sampleID to MIC etc.
        rows = [], // this will hold the new data structure
        columns = ["position"],
    	sequence = "sequence",
    	sampleID = 'sampleID';
    // initialise the new data structure with objects for each position in the sequence
    for (var i = 0; i < Object.keys(data[0][sequence]).length; i++) {
        rows.push({ position: i + 1 });
    }

    // loop through each current sample's sequence
    data.forEach(function(obj) {
        var id = obj[sampleID];
        var seq = obj[sequence];
        columns.push(id);
        mapping[id] = {
            sequence: seq.join(''), // store the sample's sequence as a string for mapping
            MIC: obj.MIC
        };

        // loop through each base in sequence and add it to the corresponding position in rows
        seq.forEach(function(base, i) {
            rows[i][id] = base;
        });

    });
    rows.columns = columns;

    // final nesting
    rows =  rows.columns.slice(1).map(function(id) {
        return {
            id: id,
            values: rows.map(function(d) {
                return {position: d.position, bases: d[id]};
            })
        };
    });

    return { data: rows, mapping: mapping };
}

module.exports = parser;