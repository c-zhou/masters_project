/**
 * Created by m.hall on 1/3/17.
 */

//================================================
//================================================
	// THIS MIDDLEWARE DOESNT WORK BUT I AM
	// LEAVING IT HERE FOR POSSIBLE LATER USE
//================================================
//================================================


var fs    = require('fs'),
    d3    = require('d3'),
    jsdom = require('jsdom');

var chartWidth = 500,
    chartHeight = 500;

var arc = d3.arc()
	.outerRadius(chartWidth / 2 - 10)
	.innerRadius(0);

var colours = ['#F00','#000','#000','#000','#000','#000','#000','#000','#000'];

module.exports = function(pieData, outputLocation){
	if(!pieData) pieData = [12, 31];
	if(!outputLocation) outputLocation = "test.svg";

	var document = jsdom.jsdom();
	var svg = d3.select(document.body)
		.append('svg')
		.attr({
			width: chartWidth,
			height: chartHeight
		})
		.append('g')
		.attr('transform', 'translate(' + chartWidth / 2 + ',' + chartWidth / 2 + ')');

	svg.selectAll('.arc')
		.data(d3.pie()(pieData))
		.enter()
		.append('path')
		.attr({
			'class': 'arc',
			'd': arc,
			'fill': function(d, i){
				return colours[i];
			},
			'stroke': '#fff'
		});

	fs.writeFileSync(outputLocation, window.d3.select('.container').html());

	// jsdom.env({
	// 	html: '<html><body></body></html>',
	// 	features: { QuerySelector: true },
	// 	done: function(errors, window){
	// 		if(errors){
	// 			console.log("jsdom error: " + errors);
	// 		}
	// 		window.d3 = d3.select(window.document); // get d3 into the DOM
	// 		console.log(window.document);
	// 		// do your normal d3 stuff
	// 		var svg = window.d3.select('body');
	//
	// 		svg.append('div').attr('class', 'container'); // make a container div
	// 		// console.log(svg);
	// 		svg.append('svg');
	// 		svg.attr({
	// 				xmlns: 'http://www.w3.org/2000/svg',
	// 				width: chartWidth,
	// 				height: chartHeight
	// 			})
	// 			.append('g')
	// 			.attr('transform', 'translate(' + chartWidth / 2 + ',' + chartWidth / 2 + ')');
	//
	// 		svg.selectAll('.arc')
	// 			.data(d3.pie()(pieData))
	// 			.enter()
	// 			.append('path')
	// 			.attr({
	// 				'class': 'arc',
	// 				'd': arc,
	// 				'fill': function(d, i){
	// 					return colours[i];
	// 				},
	// 				'stroke': '#fff'
	// 			});
	//
	// 		// write out the children of the container div
	// 		// using sync to keep the code simple
	// 		fs.writeFileSync(outputLocation, window.d3.select('.container').html());
	// 	}
	// });
};

if (require.main === module){
	module.exports();
}