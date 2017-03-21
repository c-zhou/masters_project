/**
 * Created by michaelhall on 21/3/17.
 */
var d3 = require('d3'),
    doc = require('jsdom').jsdom(),
    sankeyDiagram = require('../middleware/sankeyDiagram');

var getSankeyDiagram = function(params) {

    // console.log("Graph variable inside getSankeyDiagram(): ");
    // console.log(params.data);

    var chart = sankeyDiagram()
        .width(700 * 1.5)
        .height(300 * 2)
        .nodeWidth(20)
        .nodePadding(20)
        .legendRectSize(25);

	d3.select(doc.body)
		.enter().data(params.data)
		.append('div')
		.attr('id', params.containerId)

		.call(chart);

    var svg = d3.select(doc.getElementById(params.containerId))
        .node()
        .outerHTML;

    d3.select(doc.getElementById(params.containerId)).remove();

    return svg;
};

module.exports = getSankeyDiagram;