//Sean Klein 5575709

// DIMENSIONS //

let margin = {top: 40, right: 30, bottom: 65, left: 50},
    width = 1400 - margin.left - margin.right,
    height = 800 - margin.top - margin.bottom;

// create intial svg
let svg = d3.select("#stacked_bar")
    .append('svg')
    .attr("width", width + margin.left+ margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")

// FUNCTIONS //

// create distinct options from continuous data and append as extra columns (in place!!!)
// Florian Kellner 4090126
function generate_options(data, field, amount) {
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

// create distinct options for both non-categorical values in the table
generate_options(dataset, 'Age', 4);
generate_options(dataset, 'Diversity', 4);
console.log(dataset);


// INPUT Handling //

//both can take the form of "Nationality", "Sex", "Age_group", "BMI_group", "Diversity_group"
//define defaults
var xAttr = "Nationality"
var colorAttr = "Age_group"

//draw initial graph with defaults
drawGraph(xAttr, colorAttr);

const options = ['BMI_group', 'Age_group', 'Diversity_group', 'Sex', 'Nationality', 'DNA_extraction_method']

//add options to html
const colorOption = d3.select('#colors');
colorOption.selectAll("option")
    .data(options)
    .enter()
    .append("option")
    .html(function(d) {return d;})

const xOption = d3.select('#x_axis');
xOption.selectAll("option")
    .data(options)
    .enter()
    .append("option")
    .html(function(d) {return d;})

const content = d3.select('#content');
content.on('change', function(event) {
    if (event.target.id == "x_axis") {
        xAttr = event.target.value
    } 
    else if (event.target.id == "colors"){
        colorAttr = event.target.value
    }
    drawGraph(xAttr, colorAttr)
})



// sorting of objects based on the passd attribute, uses array-inidces for custom sorting.
function customSort(data, attribute) {

    let KeyOrder = [
        'underweight', 'lean', 'overweight', 'obese', 'severeobese', 'morbidobese', 
        'r', 'o', 'p',
        'Unknown', null, NaN] // put bad values at the end


    //check if column of first object, holds true for all objects in theory since null-values are handeled
    if (attribute in data[0]) { 

        //uses the index 
        return data.sort( (a, b) => KeyOrder.indexOf(a[attribute]) - KeyOrder.indexOf(b[attribute]));
    }
    else {
        return d3.sort(data, (a, b) => d3.ascending(a[attribute], b[attribute]))
    }
}


function drawGraph(xAttr, colorAttr) {

    dataset = customSort(dataset, xAttr)

    svg.html('');

    // VARIABLES //

    // create map with nested maps
    // keys: X-Axis, values: maps of stacks: key-value
    let countMap = d3.rollup(dataset, 
        v => v.length, 
        key => (key[xAttr] == null) ? "Unknown" : key[xAttr], 
        key => (key[colorAttr] == null) ? "Unknown" : key[colorAttr]);
        
    console.log(countMap)

    let colorKeys = new Set()
    countMap.forEach(function(value, key){
        Array
        .from(value.keys())
        .forEach(value => colorKeys.add(value))
    })

    // convert map to array of objects of length 1
    // key: name on x-Axis, value: stacks for bar as map
    let countArray = Array.from(countMap, ([key, value]) => ({key, value}));

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

    // console.log(Array.from(flatCountArray, obj => obj.Group))

    // d3.stack automatically defines position for different items to be stacked
    // on top of each other
    let stack = d3.stack()
        .keys(colorKeys)
        .value(function(d, key) {
            if (d[key] == null){ // if one group has no values for a bar color, e.g. no "unkowns"
                return 0 // return 0 instead of NaN to avoid parsing warnings (no stack is created either way)
            }
            else { 
                return d[key]; //key is each type of occurence of bar-attribute
            } 
        })
        .order(d3.stackOrderNone)
        .offset(d3.stackOffsetNone);

    // console.log(stack(flatCountArray));

    // Y AXIS //

        // y scale
        let yScale = d3.scaleLinear()
            .domain([0, d3.max( //find max
                d3.rollup(dataset, //get counts as map-values
                value => value.length, //count occurences, output as map
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
            .domain(Array.from(countMap.keys())) 
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
            .domain(colorKeys //keys from first entry in Counts
                ) 
            .range(d3.schemeTableau10) //for reference: https://github.com/d3/d3-scale-chromatic/tree/v2.0.0#categorical
        
        // add stacks to graph
        svg.append('g')
            .selectAll("g")
            .data(stack(flatCountArray))
            
            .enter().append("g")
                .attr("fill", function(d) { return color(d.key); })
                .selectAll("rect")
                .data(function(d) { return d; })
                .enter()
                .append("rect")
                    // .attr("class",  function(d) {  //map 'svg elements' to classes
                    //     return "bin " + d[0];}) // returns names of X attribute
                    .attr("x", function (d) { return xScale(d.data.Group);}) // "Group" is acessor of Strings for x-axis 
                    .attr("y", function (d) { return yScale(d[1]); } ) // d[1] denotes end postion of stack
                    
                    .attr("width", xScale.bandwidth())
                    .on("mousemove",(event,d) => {whileMouseOver(event,d)})
                    .on("mouseout",(event,d)  => {whileMouseOut(event,d)})
                    .style("opacity", "0.8")
                    .attr("stroke", "grey")

                    .data(function(d) { return d; })
                        .transition()
                        .duration(400)
                        .ease(d3.easeLinear)
                        .attr("height", function (d) { return yScale(d[0]) - yScale(d[1]); })

    // TOOLTIP //

    // helpful: https://stackoverflow.com/a/63693424
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
        // console.log(event.target.__data)

    tooltip
        .style("visibility","visible")
        //d.data returns the values of the bar as a object
        .html(JSON.stringify(d.data) //write to string and format using regex & replace()
            .replace(/,/g , "<br>")
            .replace(/{|}|"/g, "")
            .replace(/:/g, ": ")
            )
        .style('left', event.pageX + 25 + 'px')
        .style('top', event.pageY - 20 + 'px');

    }

    function whileMouseOut(event,d) {
        tooltip.style("visibility","hidden");
    }

    // LEGEND //

    //http://bl.ocks.org/gencay/4629518
    let legend = svg.selectAll("legend.colors")
        .data(Array.from(colorKeys).reverse()) //reverse(): consistent order of colors in legend and bars
        .enter()
        .append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) { return "translate(0," + (15 + i * 25) + ")"; });

    legend.append("rect")
        .attr("x", width)
        .attr("width", 20)
        .attr("height", 20)
        // .attr("stroke", "grey")
        .style("fill", color);

    legend.append("text")
        .attr("x", width - 5 )
        .attr("y", 10)
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text(function(d) { return d; });

    svg.selectAll("legend.title")
        .data([0]) //empty data to draw only once
        .enter()
        .append("text")
        .attr("class", "title")
        .text(colorAttr)
        .attr("x", width + 20)
        .attr("y", 0)
        .style("text-anchor", "end")
};