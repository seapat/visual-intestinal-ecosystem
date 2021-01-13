//Sean Klein 5575709

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

// create distinct groups from continuous data and append as extra columns (in place!!!)
// Florian Kellner 4090126
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

  // create distinct groups for both non-categorical values in the table
generate_groups(dataset, 'Age', 4);
generate_groups(dataset, 'Diversity', 4);
console.log(dataset);

// INPUT //

//both can take the form of "Nationality", "Sex", "Age_group", "BMI_group", "Diversity_group"
let xAttr = "Nationality"
let barGroup = "Sex"

// VARIABLES //

/*
let groupX = d3.group(dataset, key => (key[xAttr] == null) ? "Unknown" : key[xAttr])

// groupXSortY is created from the dataset provided via flask (see above)
// contains a nested array: [0] -> Name of the group 
//                          [1] -> array of objects, each object is one subject with its data as keys/values
// let groupXSortY = d3.sort(groupX, group =>  d3.mean(group[1], obj => obj[yAttr])); //d[1] references the array of objects
let groupXSortY = d3.sort(groupX, group =>  group[1].length); //d[1] references the array of objects

console.log(groupX)
console.log(groupXSortY)

*/

// create map with nested maps
// keys: X-Axis, values: maps of stacks: key-value
let countMap = d3.rollup(dataset, 
    v => v.length, 
    key => (key[xAttr] == null) ? "Unknown" : key[xAttr], 
    key => (key[barGroup] == null) ? "Unknown" : key[barGroup]);


console.log(countMap)
console.log(Array.from(countMap.keys()))
console.log(Array.from(countMap.values().next().value.keys()))

// let countMap2 = d3.rollup(dataset, 
//     v => v.length, 
//     key => (key[barGroup] == null) ? "Unknown" : key[barGroup],
//     key => (key[xAttr] == null) ? "Unknown" : key[xAttr]);

// console.log(countMap2)

// convert map to array of objects of length 1
// key: name on x-Axis, value: stacks for bar as map
let countArray = Array.from(countMap, ([key, value]) => ({key, value}));

console.log(countArray)

//https://stackoverflow.com/a/44444443/14276346
//Loop through the nested array and create a new array element that converts each individual nested element into a key/value pair in a single object.
var flatCountArray = [];
countArray.forEach(function(d) {
var obj = { Group: d.key } //old key -> value of 'Group'
    d.value.forEach(function(value, key) { //append key value pairs that were previously inside nested maps
        obj[key] = value; 
    });
flatCountArray.push(obj);
});

console.log(flatCountArray)

console.log(Array.from(flatCountArray, obj => obj.Group))

// d3.stack automatically defines position for different items to be stacked
// on top of each other
let stack = d3.stack()
    .keys( ["male", "female", "Unknown"] )
    .value(function(d, key) {
        if (d[key] == null){ //if one group has no values for a bar color, e.g. no "unkowns"
            return 0 //return 0 instead of NaN, so that no error is thrown (no stack is created either way)
        }
        else {
            return d[key]; //key is each type of occurence of bar-attribute
        } 
        
      })
    .order(d3.stackOrderNone)
    .offset(d3.stackOffsetNone);

console.log(stack(flatCountArray));

// Y AXIS //

    // y scale
    let yScale = d3.scaleLinear()
        .domain([0, d3.max( //find max
            d3.rollup(dataset, value => value.length, //count occurences, output as map
                key => (key[xAttr] == null) ? "Unknown" : key[xAttr]) // replace null by unkown
            .values()) ]) //iterate over value
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
        .text("Subjects")
        //.style("font-size", 12);

// X AXIS //
    
    // x scale
    let xScale = d3.scaleBand()
        .domain(Array.from(countMap.keys()) 
            ) 
        .range([0, width])
        .padding(0.5);

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

// DRAW BARS //

    // color palette = one color per subgroup
    let color = d3.scaleOrdinal()
        .domain(Array.from(countMap.values().next().value.keys())
            ) 
        .range(['blue','pink','green','red','orange']) //TODO: add Color-Array from lecture
    
    // add stacks to graph
    svg.append('g')
        .selectAll("g")
        .data(stack(flatCountArray))
        .enter().append("g")
            .attr("fill", function(d) { return color(d.key); })
            .selectAll("rect")
            .data(function(d) { return d; })
            .enter().append("rect")
                // .attr("class",  function(d) {  //map 'svg elements' to classes
                //     return "bin " + d[0];}) // returns names of X attribute
                .attr("x", function (d) { return xScale(d.data.Group);}) // "Group" is acessor of Strings for x-axis 
                .attr("y", function (d) { return yScale(d[1]); } ) // d[1] denotes end postion of stack
                .attr("height", function (d) { return yScale(d[0]) - yScale(d[1]); })
                .attr("width", xScale.bandwidth())
                .on("mousemove",(event,d) => {whileMouseOver(event,d)})
                .on("mouseout",(event,d) => {whileMouseOut(event,d)})
                .style("opacity", "0.8")


// TOOLTIP //

// Define the div for the tooltip
const tooltip = d3
    .select('body')
    .append('tooltip')
    .attr('class', 'tooltip')
    .style("visibility","hidden");

function whileMouseOver(event,d){ 
    // console.log(d); // range of current stack
    // console.log(d.data); //data of whole bar as object
    // console.log(d3.pointer(event)); //coords of mous pointer

    // console.log(d3.select(this))  // returns some ??? object
    // console.log(d3.select(event.currentTarget)); // same as select.this()
    // console.log(d3.select(event.currentTarget).node()); //returns svg of stack

  tooltip
    .style("visibility","visible")
    //d.data returns the values of the bar as a object
    .html(JSON.stringify(d.data) //write to string and format using regex & replace()
        .replace(/,/g , "<br>")
        .replace(/{|}|"/g, "")
        .replace(/:/g, ": ")
        )
    .style('left', event.x + 25 + 'px')
    .style('top', event.y + 'px');

}

function whileMouseOut(event,d) {
    tooltip
      .style("visibility","hidden")
}