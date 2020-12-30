//Sean Klein 5575709

// gets the nested javascript object containing metadata and measurment data as an additional
// all other operations (extract axis labels, count or summarize column values) are done in javascript


console.log(dataset);

// VARIABLES //

//extract nationality column, used for x axis and scaling bubble size, rename empty cells to "Unkown"
let nationalities = dataset.map(d => (d["Nationality"] == null) ? "Unknown" : d["Nationality"]);



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

    //make values unique via new Set
    let nationLabels = new Set(nationalities);
    console.log(nationLabels)


    // x scale'
    let xScale = d3.scaleBand()
        .domain(nationLabels) //TODO: sort occurence in some way (either by average age, bubble size or alphabet)
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

// DRAW BUBBLES //

    // count occurences of nationalities https://stackoverflow.com/a/46090384/14276346
    let nationCounts = nationalities.reduce((nationCounts, val) => nationCounts.set(val, 1 + (nationCounts.get(val) || 0)), new Map());
    console.log(nationCounts)
    console.log(Math.max(nationCounts.values())) //TODO: get max value across all cells
    console.log(Math.max.apply(nationCounts))

    // scale bubble size
    let bubbleScale = d3.scaleSqrt()
        .domain([1, 10])
        .range([2 , 26]);