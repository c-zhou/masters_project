var margin = {top: 30, right: 10, bottom: 10, left: 10},
    width  = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

var x = d3.scalePoint().range([0, width], 1), // point scale for the x axis
    y = {};

var line = d3.line(), // a new line generator with default settings
    axis = d3.axisBottom(), // a new bottom-oriented generator that takes a scale
    background,
    foreground;

// setting the height, width and position of the svg element
var svg = d3.select('body').append('svg')
    .attr({
        'width': width + margin.left + margin.right,
        'height': height + margin.top + margin.bottom
    })
    .append('g')
    .attr({
        'transform': 'translate(' + margin.left + ',' + margin.top + ')'
    });

d3.csv('cars.csv', function(error, cars) {

    // extract the list of dimensions and create a scale for each
    x.domain(dimensions = d3.keys(cars[0]).filter(function(d) {
        console.log("y[d] = " + y[d]); // NOT SURE WHAT THIS VALUE IS
        return d != 'name' && (y[d] = d3.scaleLinear()
                                        // extent returns the min and max values in given array (cars) with the
                                        // accessor function mapping all values as numbers in this case
                                        .domain(d3.extent(cars, function(p) { return +p[d] }))
                                        .range([height, 0]));
    }));

    // add grey background lines for context
    background = svg.append('d')
        .attr('class', 'background')
        .selectAll('path')
        .data(cars)
        .enter().append('path')
        .attr('d', path);


});