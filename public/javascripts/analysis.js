/**
 * Created by michaelhall on 5/3/17.
 */

//============================================================
// Code for opening the websocket and sending/receiving information through it
// Mostly button listeners and text boxes used to gather this information
//============================================================

var getStartedButton    = $('#getStarted'),
    fadeTime            = 400,
    readPathsForm       = $('#readPathsForm'),
    startAnalysisButton = $('#startAnalysis'),
    chartContainer      = $('#chartContainer'),
    stopAnalysisButton  = $('#stopAnalysis');

var socket;

// open the websocket connection.
// fade out the get started button when clicked and fade in the read path entry box
getStartedButton.click(function(){
	// open the websocket connection and store the socket in a variable to be used elsewhere
	socket = io.connect(location.href);

	socket.on('error', function(error) {
		console.log("Client-side socket error: ");
		console.log(error);
	});

	console.log("Socket connected on client side");

	$(this).fadeOut(fadeTime, function(){
		readPathsForm.fadeIn(fadeTime);
	});
});

// When the user submits the path, get that path and send to the analysis route,
// fade out the form and reveal the start button
readPathsForm.submit(function(e){
	// prevents default action of form
	e.preventDefault();

	//TODO - error handling for when the text fields are empty. Add folder chooser.

	// send the path to the server
	socket.emit('paths', {
		pathToInput: $('#readsPath').val(), // path to the user's reads
		pathToVirus: $('#virusPath').val(), // path to virus database
		pathForOutput: $('#outputPath').val(), // folder to run analysis from
		outputFile: $('#outputFile').val() // file name for output
	});

	$(this).fadeOut(fadeTime, function(){
		startAnalysisButton.fadeIn(fadeTime);
	});
});

// When the user clicks start, hide the start button and reveal the stop button and
// div that the chart will be added to. Then, start the child process and plotting.
startAnalysisButton.click(function(){
	// send message to server to start the species typing script
	socket.emit('startAnalysis');

	$(this).fadeOut(fadeTime, function(){
		stopAnalysisButton.fadeIn(fadeTime);
		chartContainer.fadeIn(fadeTime);
	});

	// initiate plotting
	plot(socket);
});

// When the stop button is clicked, kill the child process running the species typing and
// close the websocket.
stopAnalysisButton.click(function(){
	stopAnalysisButton.fadeOut(fadeTime);
	socket.emit('kill');
});



//============================================================
// D3 code for making the donut chart
//============================================================

// variables required across both functions
var svg,
    arc,
    div,
    pie,
    radius,
    colour,
    outerArc,
    legendSpacing,
    legendRectSize,
    numberFormatPerc;


// function that controls the plotting
function plot(socket){

	var width            = 960,
	    height           = 450,
	    interval         = 3000, // timer interval for plotting
	    padAngle         = 0.01,
	    floatFormat      = d3.format('.4r'), // will format as float to 4 decimal places
	    cornerRadius     = 4,
	    plottingStarted  = false,
	    chartTimer,
	    mostRecentData;

	colour = d3.scaleOrdinal(d3.schemeCategory20);
	radius           = Math.min(width, height) / 2;
	numberFormatPerc = d3.format(',.2%'); // will format numbers to percentage to 2 decimal places

	socket.on('stdout', function(data){

		// keep the most recently received data on the client-side
		mostRecentData = data;

		// i.e is this is the first time data has been received
		if (!plottingStarted){
			// setup interval to trigger plotting every given interval
			chartTimer = setInterval(function(){
				// update chart
				drawChart(mostRecentData, svg);
			}, interval);

			// when user resizes the window, replot based on the window's size
			window.addEventListener('resize', drawChart(mostRecentData));

			plottingStarted = true;
		}
	});

	// stop the plotting timer when the stop button is clicked
	stopAnalysisButton.click(function(){
		clearInterval(chartTimer);
	});



	svg = d3.select('#chartContainer')
		.append('svg')
		.attr('class', 'shadow')
		.append('g');

	svg.append('g')
		.attr('class', 'slices');

	svg.append('g')
		.attr('class', 'labelName');

	svg.append('g')
		.attr('class', 'labelValue');

	svg.append('g')
		.attr('class', 'lines');

	pie = d3.pie()
		.sort(null)
		.value(function(d){
			return floatFormat(d.prob);
		});

	arc = d3.arc()
		.outerRadius(radius * 0.8)
		.innerRadius(radius * 0.6)
		.cornerRadius(cornerRadius)
		.padAngle(padAngle);


	outerArc = d3.arc()
		.innerRadius(radius * 0.9)
		.outerRadius(radius * 0.9);

	legendRectSize = radius * 0.08;
	legendSpacing  = radius * 0.1;

	div = d3.select('body')
		.append('div')
		.attr('class', 'toolTip');

	svg.attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')');
}


// function that causes the actual chart to be 'drawn'
function drawChart(data){

	var chartDiv = document.getElementById('chartContainer');

	var width  = chartDiv.clientWidth,
	    height = chartDiv.clientHeight;

	svg.attr('width', width)
		.attr('height', height);

	svg.attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')');

	// PIE SLICES
	var slice = svg.select('.slices')
		.selectAll('path.slice')
		.data(pie(data), function(d){
			return d.data.species;
		});

	slice.enter()
		.insert('path')
		.style('fill', function(d){
			return colour(d.data.species);
		})
		.attr('class', 'slice');

	slice.transition().duration(750)
		.attrTween('d', function(d){
			this._current = this._current || d;
			var interpolate = d3.interpolate(this._current, d);
			this._current = interpolate(0);
			return function(t){
				return arc(interpolate(t));
			};
		});

	slice.on('mousemove', function(d){
		div.style('left', d3.event.pageX + 10 + 'px')
			.style('top', d3.event.pageY - 25 + 'px')
			.style('display', 'inline-block')
			.html(d.data.species + '<br>' + numberFormatPerc(d.data.prob));
	});

	slice.on('mouseout', function(d){
		div.style('display', 'none');
	});

	slice.exit()
		.remove();

	var legend = svg.selectAll('.legend')
		.data(colour.domain())
		.enter()
		.append('g')
		.attr('class', 'legend')
		.attr('transform', function(d, i){
			var height = legendRectSize + legendSpacing,
			    offset = height * colour.domain().length / 2,
			    horz   = -3 * legendRectSize,
			    vert   = i * height - offset;
			return 'translate(' + horz + ',' + vert + ')';
		});

	legend.append('rect')
		.attr('width', legendRectSize)
		.attr('height', legendRectSize)
		.attr('rx', 20)
		.attr('ry', 20)
		.style('fill', colour)
		.style('stroke', colour);

	legend.append('text')
		.attr('x', 30)
		.attr('y', 12)
		.text(function(d){
			// parse the species label if it is longer than 30 characters
			if(d.length > 30){
				d = d.substr(0, 27) + "...";
			}
			return d;
		});

	// TEXT LABELS

	var text = svg.select('.labelName')
		.selectAll('text')
		.data(pie(data), function(d){
			var species = d.data.species;
			// parse the species label if it is longer than 30 characters
			if(d.data.species.length > 30){
				species = d.data.species.substr(0, 27) + "...";
			}
			return species
		});

	text.enter()
		.append('text')
		.attr('dy', '0.35em')
		.text(function(d){
			var species = d.data.species;
			// parse the species label if it is longer than 30 characters
			if(d.data.species.length > 30){
				species = d.data.species.substr(0, 27) + "...";
			}
			return species + ': ' + numberFormatPerc(d.value);
		});

	function midAngle(d){
		return d.startAngle + (d.endAngle - d.startAngle) / 2;
	}

	text.transition().duration(750)
		.attrTween('transform', function(d){
			this._current = this._current || d;
			var interpolate = d3.interpolate(this._current, d);
			this._current = interpolate(0);
			return function(t){
				var d2  = interpolate(t),
				    pos = outerArc.centroid(d2);
				pos[0] = radius * (midAngle(d2) < Math.PI ? 1 : -1);
				return 'translate(' + pos + ')';
			};
		})
		.styleTween('text-anchor', function(d){
			this._current = this._current || d;
			var interpolate = d3.interpolate(this._current, d);
			this._current = interpolate(0);
			return function(t){
				var d2 = interpolate(t);
				return midAngle(d2) < Math.PI ? 'start':'end';
			};
		})
		.text(function(d){
			var species = d.data.species;
			// parse the species label if it is longer than 30 characters
			if(d.data.species.length > 30){
				species = d.data.species.substr(0, 27) + "...";
			}
			return species + ': ' + d.value * 100 + '%';
		});

	text.exit()
		.remove();


	// SLICE TO TEXT POLYLINES

	var polyline = svg.select('.lines')
		.selectAll('polyline')
		.data(pie(data), function(d){
			var species = d.data.species;
			// parse the species label if it is longer than 30 characters
			if(d.data.species.length > 30){
				species = d.data.species.substr(0, 27) + "...";
			}
			return species;
		});

	polyline.enter()
		.append('polyline');

	polyline.transition().duration(750)
		.attrTween('points', function(d){
			this._current = this._current || d;
			var interpolate = d3.interpolate(this._current, d);
			this._current = interpolate(0);
			return function(t){
				var d2  = interpolate(t),
				    pos = outerArc.centroid(d2);
				pos[0] = radius * 0.95 * (midAngle(d2) < Math.PI ? 1 : -1);
				return [arc.centroid(d2), outerArc.centroid(d2), pos];
			};
		});

	polyline.exit()
		.remove();
}