var sankeyDiagram = function() {
	// default values if none are given on diagram construction
	var width        = 700,
	    height       = 400,
	    units        = "Widgets",
	    margin       = {top: 10, right: 10, bottom: 10, left: 10},
	    darker       = 2,
	    nodeWidth    = 36,
	    nodeLabels   = false,
	    nodePadding  = 40,
	    numberFormat = ',.0f', // zero decimal places
	    sankeyLayout = 32,
	    rectCornerRadius = 3, // round corners on the node rectangles
	    legendRectSize = 18,
	    legendSpacing = 4,
	    formatNumber = d3.format(numberFormat),
	    // this function will return a given number formatted by formatNumber and then with our
	    // units ('Widgets') added to the end
	    format       = function(d) { return formatNumber(d) + ' ' + units; },
	    // accesss to a predefined colour-scheme
	    color        = d3.scaleOrdinal(d3.schemeCategory20);

	function chart(selection){
		var data = selection.enter().data();

		var graph = seqToGraph(data);

		// append the svg object to the body of the page
		var svg = selection.append('svg')
			.attr('width', width + margin.left + margin.right)
			.attr('height', height + margin.top + margin.bottom)
			.append('g')
			.attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

		// set the sankey diagram properties
		var sankey = d3.sankey()
			.nodeWidth(nodeWidth)
			.nodePadding(nodePadding) // padding between nodes
			.size([width - legendRectSize * 2.5, height]); // size of the sankey diagram

		// defines the path variable as a pointer to the sankey function that makes the links between
		// the nodes do their clever thing of bending into the right places. This function is defined in
		// the sankey d3 plug-in
		var path = sankey.link();

		sankey
			.nodes(graph.nodes) // nodes are defined within the structure of the json file
			.links(graph.links) // links are defined within the structure of the json file
			.layout(sankeyLayout); // not sure what this is. maybe play around with it

		// add in the links
		var link = svg.append('g').selectAll('.link')
			.data(graph.links)
			.enter().append('path')
			.attr('class', 'link')
			.attr('d', path)
			// we set the stroke-width to the value associated with each link or 1. Whichever is larger
			.style('stroke-width', function (d) {
				return Math.max(1, d.dy);
			})
			// this makes sure the link for which the target has the highest y coordinate departs first
			// first out of the rectangle. This basically means there is minimal crossover of flows
			.sort(function (a, b) {
				return b.dy - a.dy;
			});

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
			.attr('height', function (d) {
				return d.dy;
			})
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
				.data(color.domain()).enter()
				.append('g')
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


	// function for parsing data from sequence file into the graph format the sankey diagram needs
	function seqToGraph(data){
		// set up graph in same style as original exmaple but empty
		var graph = {"nodes": [], "links": []};

		data.forEach(function(sample, i) {
			sample.nodes.forEach(function(d, i) {
				graph.nodes.push(d);
			});
			sample.links.forEach(function(d, i) {
				graph.links.push(d);
			});
		});

		//return only the distinct / unique nodes
		graph.nodes = d3.keys(d3.nest()
			.key(function (d) {
				return d;
			})
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

	return chart;
};

// function to parse each row in tab separated file. should be passed as a row function on d3.tsv()
function parseMSA(row) {
	var nodes = Array.from(row.sequence),
	    links = [];

	nodes.forEach(function(d, i) {
		nodes[i] = d + i;
	});

	nodes.forEach(function(d, i) {
		if (i < nodes.length - 1) {
			links.push({
				"source": d,
				"target": nodes[i + 1],
				"value": 1,
				"sampleID": row.sampleID
			});
		}
	});

	return {
		"nodes": nodes,
		"links": links
	};
}


// ===============================================================
// D3-SANKEY PLUGIN
// ===============================================================
// https://github.com/d3/d3-sankey Version 0.4.2. Copyright 2017 Mike Bostock.
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3-array'), require('d3-collection'), require('d3-interpolate')) :
		typeof define === 'function' && define.amd ? define(['exports', 'd3-array', 'd3-collection', 'd3-interpolate'], factory) :
			(factory((global.d3 = global.d3 || {}),global.d3,global.d3,global.d3));
}(this, (function (exports,d3Array,d3Collection,d3Interpolate) { 'use strict';

	var sankey = function() {
		var sankey = {},
		    nodeWidth = 24,
		    nodePadding = 8,
		    size = [1, 1],
		    nodes = [],
		    links = [];

		sankey.nodeWidth = function(_) {
			if (!arguments.length) return nodeWidth;
			nodeWidth = +_;
			return sankey;
		};

		sankey.nodePadding = function(_) {
			if (!arguments.length) return nodePadding;
			nodePadding = +_;
			return sankey;
		};

		sankey.nodes = function(_) {
			if (!arguments.length) return nodes;
			nodes = _;
			return sankey;
		};

		sankey.links = function(_) {
			if (!arguments.length) return links;
			links = _;
			return sankey;
		};

		sankey.size = function(_) {
			if (!arguments.length) return size;
			size = _;
			return sankey;
		};

		sankey.layout = function(iterations) {
			computeNodeLinks();
			computeNodeValues();
			computeNodeBreadths();
			computeNodeDepths(iterations);
			computeLinkDepths();
			return sankey;
		};

		sankey.relayout = function() {
			computeLinkDepths();
			return sankey;
		};

		sankey.link = function() {
			var curvature = .5;

			function link(d) {
				var x0 = d.source.x + d.source.dx,
				    x1 = d.target.x,
				    xi = d3Interpolate.interpolateNumber(x0, x1),
				    x2 = xi(curvature),
				    x3 = xi(1 - curvature),
				    y0 = d.source.y + d.sy + d.dy / 2,
				    y1 = d.target.y + d.ty + d.dy / 2;
				return "M" + x0 + "," + y0
					+ "C" + x2 + "," + y0
					+ " " + x3 + "," + y1
					+ " " + x1 + "," + y1;
			}

			link.curvature = function(_) {
				if (!arguments.length) return curvature;
				curvature = +_;
				return link;
			};

			return link;
		};

		// Populate the sourceLinks and targetLinks for each node.
		// Also, if the source and target are not objects, assume they are indices.
		function computeNodeLinks() {
			nodes.forEach(function(node) {
				node.sourceLinks = [];
				node.targetLinks = [];
			});
			links.forEach(function(link) {
				var source = link.source,
				    target = link.target;
				if (typeof source === "number") source = link.source = nodes[link.source];
				if (typeof target === "number") target = link.target = nodes[link.target];
				source.sourceLinks.push(link);
				target.targetLinks.push(link);
			});
		}

		// Compute the value (size) of each node by summing the associated links.
		function computeNodeValues() {
			nodes.forEach(function(node) {
				node.value = Math.max(
					d3Array.sum(node.sourceLinks, value),
					d3Array.sum(node.targetLinks, value)
				);
			});
		}

		// Iteratively assign the breadth (x-position) for each node.
		// Nodes are assigned the maximum breadth of incoming neighbors plus one;
		// nodes with no incoming links are assigned breadth zero, while
		// nodes with no outgoing links are assigned the maximum breadth.
		function computeNodeBreadths() {
			var remainingNodes = nodes,
			    nextNodes,
			    x = 0;

			while (remainingNodes.length) {
				nextNodes = [];
				remainingNodes.forEach(function(node) {
					node.x = x;
					node.dx = nodeWidth;
					node.sourceLinks.forEach(function(link) {
						if (nextNodes.indexOf(link.target) < 0) {
							nextNodes.push(link.target);
						}
					});
				});
				remainingNodes = nextNodes;
				++x;
			}

			//
			moveSinksRight(x);
			scaleNodeBreadths((size[0] - nodeWidth) / (x - 1));
		}

		// function moveSourcesRight() {
		//   nodes.forEach(function(node) {
		//     if (!node.targetLinks.length) {
		//       node.x = min(node.sourceLinks, function(d) { return d.target.x; }) - 1;
		//     }
		//   });
		// }

		function moveSinksRight(x) {
			nodes.forEach(function(node) {
				if (!node.sourceLinks.length) {
					node.x = x - 1;
				}
			});
		}

		function scaleNodeBreadths(kx) {
			nodes.forEach(function(node) {
				node.x *= kx;
			});
		}

		function computeNodeDepths(iterations) {
			var nodesByBreadth = d3Collection.nest()
				.key(function(d) { return d.x; })
				.sortKeys(d3Array.ascending)
				.entries(nodes)
				.map(function(d) { return d.values; });

			//
			initializeNodeDepth();
			resolveCollisions();
			for (var alpha = 1; iterations > 0; --iterations) {
				relaxRightToLeft(alpha *= .99);
				resolveCollisions();
				relaxLeftToRight(alpha);
				resolveCollisions();
			}

			function initializeNodeDepth() {
				var ky = d3Array.min(nodesByBreadth, function(nodes) {
					return (size[1] - (nodes.length - 1) * nodePadding) / d3Array.sum(nodes, value);
				});

				nodesByBreadth.forEach(function(nodes) {
					nodes.forEach(function(node, i) {
						node.y = i;
						node.dy = node.value * ky;
					});
				});

				links.forEach(function(link) {
					link.dy = link.value * ky;
				});
			}

			function relaxLeftToRight(alpha) {
				nodesByBreadth.forEach(function(nodes) {
					nodes.forEach(function(node) {
						if (node.targetLinks.length) {
							var y = d3Array.sum(node.targetLinks, weightedSource) / d3Array.sum(node.targetLinks, value);
							node.y += (y - center(node)) * alpha;
						}
					});
				});

				function weightedSource(link) {
					return center(link.source) * link.value;
				}
			}

			function relaxRightToLeft(alpha) {
				nodesByBreadth.slice().reverse().forEach(function(nodes) {
					nodes.forEach(function(node) {
						if (node.sourceLinks.length) {
							var y = d3Array.sum(node.sourceLinks, weightedTarget) / d3Array.sum(node.sourceLinks, value);
							node.y += (y - center(node)) * alpha;
						}
					});
				});

				function weightedTarget(link) {
					return center(link.target) * link.value;
				}
			}

			function resolveCollisions() {
				nodesByBreadth.forEach(function(nodes) {
					var node,
					    dy,
					    y0 = 0,
					    n = nodes.length,
					    i;

					// Push any overlapping nodes down.
					nodes.sort(ascendingDepth);
					for (i = 0; i < n; ++i) {
						node = nodes[i];
						dy = y0 - node.y;
						if (dy > 0) node.y += dy;
						y0 = node.y + node.dy + nodePadding;
					}

					// If the bottommost node goes outside the bounds, push it back up.
					dy = y0 - nodePadding - size[1];
					if (dy > 0) {
						y0 = node.y -= dy;

						// Push any overlapping nodes back up.
						for (i = n - 2; i >= 0; --i) {
							node = nodes[i];
							dy = node.y + node.dy + nodePadding - y0;
							if (dy > 0) node.y -= dy;
							y0 = node.y;
						}
					}
				});
			}

			function ascendingDepth(a, b) {
				return a.y - b.y;
			}
		}

		function computeLinkDepths() {
			nodes.forEach(function(node) {
				node.sourceLinks.sort(ascendingTargetDepth);
				node.targetLinks.sort(ascendingSourceDepth);
			});
			nodes.forEach(function(node) {
				var sy = 0, ty = 0;
				node.sourceLinks.forEach(function(link) {
					link.sy = sy;
					sy += link.dy;
				});
				node.targetLinks.forEach(function(link) {
					link.ty = ty;
					ty += link.dy;
				});
			});

			function ascendingSourceDepth(a, b) {
				return a.source.y - b.source.y;
			}

			function ascendingTargetDepth(a, b) {
				return a.target.y - b.target.y;
			}
		}

		function center(node) {
			return node.y + node.dy / 2;
		}

		function value(link) {
			return link.value;
		}

		return sankey;
	};

	exports.sankey = sankey;

	Object.defineProperty(exports, '__esModule', { value: true });

})));
