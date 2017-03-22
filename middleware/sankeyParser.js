/**
 * Created by m.hall on 22/3/17.
 */

const fs = require('fs'),
	  readline = require('readline');

var d3 = require('d3');

// parse an object into graph structure required for sankey diagram
function graphParser(data) {
	// set up graph object structure
	var graph = {
		"nodes": [],
		"links": []
	};

	// loop through each sequence in the tsv data
	data.sequence.forEach(function(currentSeq, index) {
		// split the sequence into an array of bases
		var bases = currentSeq.split("");
		bases.forEach(function(currentBase, position) {
			// create a node for the current position as the base and position concatenated
			graph.nodes.push(currentBase + position);
			if (position < currentSeq.length - 1) {
				// push the link for the current base into graph
				graph.links.push({
					"source": currentBase + position,
					"target": bases[position + 1] + (position + 1),
					"sampleID": data.sampleID[index],
					"value": 1
				});
			}
		});
	});

	//return only the distinct / unique nodes
	graph.nodes = d3.keys(d3.nest()
		.key(function (d) { return d; })
		// applies the nest operator to the specified array, returning a nested map
		.object(graph.nodes));

	// loop through each link, replacing the text with its index from node
	graph.links.forEach(function (d, i) {
		graph.links[i].source = graph.nodes.indexOf(graph.links[i].source);
		graph.links[i].target = graph.nodes.indexOf(graph.links[i].target);
	});

	// loop through each node to make nodes an array of objects rather than an array of strings
	// before this operation graph.nodes was just the node names as an array of strings.
	graph.nodes.forEach(function (d, i) {
		graph.nodes[i] = {"name": d.slice(0, 1)};
	});

	return graph;
}


// function that returns an object with keys as the headers of the tsv file and values
// for those headers in an array
function tsvParser(fileName, callback) {

	// read from input readable stream, but one line at a time
	const rl = readline.createInterface({
		      input: fs.createReadStream(fileName)
	      });

	var data = {},
	    keys,
	    lines = 0;

	rl.on('line', function(line) {
		var row = line.split('\t');
		if (lines === 0) { // headers/keys
			keys = row;
			keys.forEach(function(currentValue) {
				data[currentValue] = []; // create key in object for each header
			});
		} else {
			row.forEach(function(currentValue, i) {
				data[keys[i]].push(currentValue); // push values into appropriate key array
			});
		}
		lines++;
	});

	rl.on('close', function() {
		return callback(data); // when done, run the given callback function on the data
	});
}

module.exports = {
	tsvParser: tsvParser,
	graphParser: graphParser
};