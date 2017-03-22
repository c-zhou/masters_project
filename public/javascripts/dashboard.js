
// resuable function for creating a sankey diagram
function sankeyDiagram() {
	// default values if none are given on diagram construction
	var graph,
	    width            = 700,
	    height           = 400,
	    units            = "Widgets",
	    margin           = {top: 10, right: 10, bottom: 10, left: 10},
	    darker           = 2, // number of shades darker when hovering mouse on link
	    nodeWidth        = 36,
	    nodeLabels       = false, // if set to true use node labels instead of legend
	    nodePadding      = 40,
	    numberFormat     = ',.0f', // zero decimal places
	    sankeyLayout     = 50,
	    rectCornerRadius = 3, // round corners on the node rectangles
	    legendRectSize   = 18, // size of the legend colour squares
	    legendSpacing    = 4, // spacing between legend squares
	    formatNumber     = d3.format(numberFormat);

	// this function will return a given number formatted by formatNumber and then with our
	// units ('Widgets') added to the end
	var format           = function(d) { return formatNumber(d) + ' ' + units; };

	// accesss to a predefined colour-scheme
	var color            = d3.scaleOrdinal(d3.schemeCategory20);

	// selection will be the DOM element for current iteration of call(chart)
	function chart(selection){
		// append the svg object to the selection
		var svg = selection.append('svg')
			.attr('width', width + margin.left + margin.right)
			.attr('height', height + margin.top + margin.bottom)
		  .append('g')
			.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

		// set the sankey diagram properties
		var sankey = d3.sankey()
			.nodeWidth(nodeWidth)
			.nodePadding(nodePadding)
			.size([width - legendRectSize * 2.5, height]); // size of the sankey diagram.

		// defines the path variable as a pointer to the sankey function that makes the links between
		// the nodes do their clever thing of bending into the right places. This function is defined in
		// the sankey d3 plug-in
		var path = sankey.link();

		sankey
			.nodes(graph.nodes) // data to use as the nodes
			.links(graph.links) // data to use as the links
			.layout(sankeyLayout); // num. iterations to compute node positioning

		// add in the links
		var link = svg.append('g').selectAll('.link')
		  .data(graph.links)
		  .enter().append('path')
			.attr('class', 'link')
			.attr('d', path)
			// we set the stroke-width to the value associated with each link or 1. Whichever is larger
			.style('stroke-width', function (d) { return Math.max(1, d.dy); })
			// this makes sure the link for which the target has the highest y coordinate departs first
			// first out of the rectangle. This basically means there is minimal crossover of flows
			.sort(function (a, b) { return b.dy - a.dy; });


		// ADD THE LINK TITLES - this appends a text element to each link when moused over that
		// contains the source and target name (with a neat arrow in between), which when applied to
		// the format function, adds the units.
		link.append('title')
			.text(function (d) {
				return d.source.name + ' → ' + d.target.name + '\n' +
					format(d.value) + '\n' + d.sampleID;
			});

		// add in the nodes
		var node = svg.append('g').selectAll('.node')
		  .data(graph.nodes)
		  .enter().append('g')
			.attr('class', 'node')
			.attr('transform', function (d) {
				return 'translate(' + d.x + ',' + d.y + ')';
			})
			.call(d3.drag()
				.subject(function (d) {
					return d;
				})
				.on('start', function () {
					this.parentNode.appendChild(this);
				})
				.on('drag', dragmove)); // will explain the darmove function lower down

		// add the rectangles for the nodes.
		node.append('rect')
			.attr('height', function (d) { return d.dy; })
			.attr('width', sankey.nodeWidth())
			.attr('rx', rectCornerRadius)
			.attr('ry', rectCornerRadius)
			// this bit removes spaces from names so that they can be given uniques colours
			.style('fill', function (d) {
				return d.color = color(d.name.replace(/ .*/, ''));
			})
			// the stroke around the outside of the rect. is then drawn in the same shade, but darker
			.style('stroke', function (d) {
				return d3.rgb(d.color).darker(darker);
			})
		  .append('title')
			.text(function (d) {
				return d.name + '\n' + format(d.value);
			});

		if (nodeLabels) {
			// add in the title for the nodes. if the x position is less than half of the diagram width
			// the label is placed on the right, otherwise on the left.
			node.append('text')
				.attr('x', 2)
				.attr('y', function (d) {
					return d.dy / 2;
				})
				.attr('dy', '.35em')
				.attr('text-anchor', 'end')
				.attr('transform', null)
				.text(function (d) {
					return d.name;
				})
				// .filter(function (d) {
				// 	return d.x < width / 2;
				// })
				// .attr('x', 6 + sankey.nodeWidth())
				.attr('x', 2)
				.attr('text-anchor', 'start');
		} else {
			// add legend if labels are not required
			var legend = svg.selectAll('.legend')
			  .data(color.domain())
			  .enter().append('g')
				.attr('class', 'legend')
				.attr('transform', function(d, i) {
					var height = legendRectSize + legendSpacing,
					    offset = height * color.domain().length / 2,
					    horz = width - legendRectSize * 2,
					    vert = i * height + offset;
					return 'translate(' + horz + ',' + vert + ')';
				});

			legend.append('rect')
				.attr('width', legendRectSize)
				.attr('height', legendRectSize)
				.attr('rx', 3) // round edges on legend squares
				.attr('ry', 3)
				.style('fill', color)
				.style('stroke', color);

			legend.append('text')
				.attr('x', legendRectSize / 2 - legendSpacing - 1) // centre text in rectangles
				.attr('y', legendRectSize / 2 + legendSpacing + 1) // 1 is a minor adjustment
				.text(function(d) { return d; });
		}

		// the function for moving the nodes
		function dragmove(d) {
			d3.select(this) // selects the item being operated on
				.attr('transform', 'translate(' + d.x + ',' +
					(d.y = Math.max(0, Math.min(height - d.dy, d3.event.y))) + ')');
			// these two lines allow translation in the y axis while maintaining the link
			sankey.relayout();
			link.attr('d', path);
		}
	}

	// GETTERS AND SETTERS
	chart.data = function(_) {
		if (!arguments.length) return graph;
		graph = _;
		return chart;
	};

	chart.width = function(_) {
		if (!arguments.length) return width;
		width = _ - margin.left - margin.right;
		// returning chart means these methods can be chained
		return chart;
	};

	chart.height = function(_) {
		if (!arguments.length) return height;
		height = _ - margin.top - margin.bottom;
		return chart;
	};

	chart.margin = function(_) {
		if (!arguments.length) return margin;
		margin = _;
		return chart;
	};

	chart.units = function(_) {
		if (!arguments.length) return units;
		units = _;
		return chart;
	};

	chart.nodeWidth = function(_) {
		if (!arguments.length) return nodeWidth;
		nodeWidth = _;
		return chart;
	};

	chart.nodePadding = function(_) {
		if (!arguments.length) return nodePadding;
		nodePadding = _;
		return chart;
	};

	chart.sankeyLayout = function(_) {
		if (!arguments.length) return sankeyLayout;
		sankeyLayout = _;
		return chart;
	};

	chart.darker = function(_) {
		if (!arguments.length) return darker;
		darker = _;
		return chart;
	};

	chart.numberFormat = function(_) {
		if (!arguments.length) return numberFormat;
		numberFormat = _;
		return chart;
	};

	chart.color = function(_) {
		if (!arguments.length) return color;
		color = _;
		return chart;
	};

	chart.rectCornerRadius = function(_) {
		if (!arguments.length) return rectCornerRadius;
		rectCornerRadius = _;
		return chart;
	};

	chart.nodeLabels = function(_) {
		if(!arguments.length) return nodeLabels;
		nodeLabels = _;
		return chart;
	};

	chart.legendRectSize = function(_) {
		if(!arguments.length) return legendRectSize;
		legendRectSize = _;
		return chart;
	};

	chart.legendSpacing = function(_) {
		if(!arguments.length) return legendSpacing;
		legendSpacing = _;
		return chart;
	};
	return chart;
}
