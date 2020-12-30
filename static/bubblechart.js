console.log(dataset);
//console.log(Math.max.apply(Math, dataset.map(function(o) { return o.Age; })));
//console.table(dataset); This take long to load upfront

// DIMENSIONS //
let margin = {top: 40, right: 150, bottom: 60, left: 30},
    width = 1400 - margin.left - margin.right,
    height = 800 - margin.top - margin.bottom;

// create intial svg
let svg = d3.select("#bubblechart")
    .append('svg')
    .attr("width", width + margin.left+ margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")


// Y AXIS //

    // y scale
    let y = d3.scaleLinear()
        .domain([0, Math.max.apply(Math, dataset.map(function(o) { return o.Age; }))]) //8 is next int after max again
        .range([ height, 0]);

    //y ticks
    svg.append("g").call(d3.axisLeft().scale(y));

    //Y Axis label
    svg.append("text")
        .attr("text-anchor", "end")
        .attr("x", -20 )
        .attr("y", -20 )
        .text("Children born per woman")
        .style("font-size", 12)
        .attr("text-anchor", "start");