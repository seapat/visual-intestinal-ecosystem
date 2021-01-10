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

// create distinct groups from continuous data
function generate_groups(data, field, amount) {
    const min = d3.min(data, d => d[field]);
    const max = d3.max(data, d => d[field]);
    const ticks = d3.ticks(min, max, amount);
    function get_group(f) {
      if (f < ticks[0]) return `${min}-${ticks[0]}`;
      for(let i = 1; i < ticks.length; i++) {
        if (f < ticks[i]) return `${ticks[i-1]}-${ticks[i]}`;
      }
      return `${ticks[ticks.length - 1]}-${max}`;
    }
    data.map(d => d[`${field}_group`] = get_group(d[field]));
  }
  
  // data
  generate_groups(dataset, 'Age', 4);
  generate_groups(dataset, 'Diversity', 4);
  console.log(dataset);
  
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
        .domain(Array.from(     //create Array of Names
                groupXSortY,    //group by x attribute, sorted by y attr
                obj => obj[0])) //extract name
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
        .range([1 , 10]); //FIXME: proper scaling missing
    
    // add bubles to graph
    svg.append('g')
        .selectAll("dot")
        // groupXSortY is created from the dataset provided via flask (see above)
        // contains a nested array: [0] -> Name of the group 
        //                          [1] -> array of objects, each object is one subject with its data as keys/values
        .data(groupXSortY) 
        .enter()
        .append("circle")
        .attr("class",  function(d) {  //map 'svg elements' to classes
            return "bin " + d[0];}) // returns names of X attribute
        .attr("cx", function (d) { 
            return xScale(d[0]);}) // position data on x axis
        .attr("cy", function (d) { 
            //loop through object/subjects per nation, calculate mean of yAttr of all nested objects
            return yScale(d3.mean(d[1] , d => d[yAttr] )); } ) 
        .attr("r", function (d) { 
            return bubbleScale(d[1].length );}) //scale by amount of objects inside each array
        .style("opacity", "0.7")
        .style("fill", "blue")