//Sean Klein 5575709

// gets the nested javascript object containing metadata and measurment data as an additional
// all other operations (extract axis labels, count or summarize column values) are done in javascript


console.log(dataset);
//console.log(Math.max.apply(Math, dataset.map(function(o) { return o.Age; })));
//console.table(dataset); //This takes a bit to load

// DIMENSIONS //
let margin = {top: 100, right: 150, bottom: 60, left: 50},
    width = 1400 - margin.left - margin.right,
    height = 800 - margin.top - margin.bottom;

// create intial svg
let svg = d3.select("#bubblechart")
    .data(dataset)
    .append('svg')
    .attr("width", width + margin.left+ margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")


// Y AXIS //

    // y scale
    let yScale = d3.scaleLinear()
        //return max value from col "Age" https://stackoverflow.com/a/4020842/14276346
        .domain([0, Math.max.apply(Math, dataset.map(d => d.Age))])
        .range([ height, 0]);

    // y ticks
    svg.append("g")
        .call(d3.axisLeft()
        .scale(yScale));

    // y Axis label
    svg.append("text")
        .attr("text-anchor", "start")
        .attr("x", -20 )
        .attr("y", -20 )
        .text("Age")
        //.style("font-size", 12);


// X AXIS //

    //extract nationality column (map), make values unique via new Set
    let nationalities = new Set(dataset.map(d => d["Nationality"])) ;
    nationalities.delete(null); //remove null in place
    //console.log(nationalities);


    // x scale'
    let xScale = d3.scaleBand()
        .domain(nationalities)
        .range([0, width]);

    // x ticks
    svg.append("g")
    .attr("transform", "translate(0," + height + ")") //put zero to the bottom
    .call(d3.axisBottom()
        .scale(xScale));

    // x axis label
    svg.append("text")
        .attr("text-anchor", "end")
        .attr("x", width)
        .attr("y", height + 50 )
        .text("Nationality")
        //.style("font-size", 12);

