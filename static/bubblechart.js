//Sean Klein 5575709

// gets the nested javascript object containing metadata and measurment data as an additional
// all other operations (extract axis labels, count or summarize column values) are done in javascript


console.log(dataset);

/*
grouped = d3.group(dataset, key => (key["Nationality"] == null) ? "Unknown" : key["Nationality"]);
console.log(grouped);

sortedByCount = d3.sort(grouped, d => d[1].length);
console.log(sortedByCount);

sortedByAge = d3.sort(grouped, d => d3.mean(d[1], value => value.Age));
console.log(sortedByAge);

counts = d3.rollup(dataset, value => value.length, key => (key["Nationality"] == null) ? "Unknown" : key["Nationality"]);
console.log(counts);

max = d3.max(
    d3.rollup(dataset, value => value.length, key => (key["Nationality"] == null) ? "Unknown" : key["Nationality"]),
    d => d[1]);
console.log(max)

console.log("separator")
*/


// FUNCTIONS //

/*
//creates map of different values inside a value, each row with that column is inside an array of that keys' value
function groupBy (columnName) {
    return d3.group(dataset, key => (key[columnName] == null) ? "Unknown" : key[columnName])
}
console.log(groupBy("Nationality"))
*/

/*
//takes a grouped map and secondary column by which the first level should be sorted by
// if no secondary column is specified, will sort by amount of objects per group
function sortByMean (groupedData, columnName=null) {
    if (columnName != null) { 
        return d3.sort(groupedData, d =>  d3.mean(
            d[1], value => value[columnName])); //d[1] references the array of arrays per group-object
    }
    else {
        return d3.sort(groupedData, d => d[1].length);
    }
}
// console.log( sortByMean(groupBy("Nationality"), "Age"));
// console.log( sortByMean(groupBy("Nationality")));
*/

/*
// extract rows by name and put into map, rename empty (null) cells to "Unkown"
// Wrapping arrow functions into normal functions is prbably bad style...
function extractColumn(columnName) {
    return dataset.map(row => (row[columnName] == null) ? "Unknown" : row[columnName]);
};
console.log( extractColumn("Nationality"));
*/

/*
// count occurences of values of given map https://stackoverflow.com/a/46090384/14276346
function countOccurences(columnName) {
    return d3.rollup(dataset, value => value.length, key => (key[columnName] == null) ? "Unknown" : key[columnName]);
};
console.log(countOccurences("Nationality"));
*/

/*
//returns max of a given map with numbers as values
function getMaxOfOccurences(columnName) {
    //return Math.max.apply(Math, Array.from( countsMap.values()));
    return d3.max(
        d3.rollup(dataset, value => value.length, key => (key[columnName] == null) ? "Unknown" : key[columnName]),
        d => d[1]);
};
console.log(getMaxOfOccurences("Nationality"));
*/

// INPUT //

let xAttr = "Nationality"
let yAttr = "Age"
let color = "Sex"

// VARIABLES //

let groupX = d3.group(dataset, key => (key[xAttr] == null) ? "Unknown" : key[xAttr])
let groupY = d3.group(dataset, key => (key[yAttr] == null) ? "Unknown" : key[yAttr])
let groupColor = d3.group(dataset, key => (key[color] == null) ? "Unknown" : key[color])

let groupXSortY = d3.sort(groupX, group =>  d3.mean(group[1], obj => obj[yAttr])); //d[1] references the array of objects

console.log(groupX)
console.log(groupXSortY)

// DIMENSIONS //

let margin = {top: 100, right: 150, bottom: 60, left: 50},
    width = 1400 - margin.left - margin.right,
    height = 800 - margin.top - margin.bottom;

// create intial svg
let svg = d3.select("#home_chart")
    .append('svg')
    .attr("width", width + margin.left+ margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")


// Y AXIS //

    // y scale
    let yScale = d3.scaleLinear()
        .domain([0, d3.max(dataset, d => d[yAttr])]) //get max Age
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
        .text("average " + yAttr)
        //.style("font-size", 12);

// X AXIS //
    
    // x scale
    let xScale = d3.scalePoint()
        .domain(Array.from( //create Array of Names
                groupXSortY, //group by nation, sort nations by average age
                obj => obj[0])) //extract nation name
        .range([0, width])
        .padding([0.5]);

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
        .text(xAttr)
        //.style("font-size", 12);

// DRAW BUBBLES //

    // scale bubble size
    let bubbleScale = d3.scaleSqrt()
        .domain([1, 10])
        .range([1 , 10]); //getMaxOfOccurences(nationCounts)
    
    // add bubles to graph
    svg.append('g')
        .selectAll("dot")
        .data(groupXSortY) //acts on dataset (json) provided by flask
        .enter()
        .append("circle")
        .attr("class",  function(d) { 
            return "bin " + d[0];}) //returns names of x
        .attr("cx", function (d) { 
            return xScale(d[0]);}) //position according to names of x
        .attr("cy", function (d) { 
            return yScale(d3.mean(d[1] , d => d[yAttr] )); } ) //loop through object/subjects per nation, calculate mean of Age
        .attr("r", function (d) { 
            return bubbleScale(d[1].length );}) //scale by size of of each nations array == amount of subjects/samples
        .style("opacity", "0.7")
        .style("fill", "blue")