//Sean Klein 5575709

console.log(dataset)

// DIMENSIONS //

let margin = {top: 40, right: 30, bottom: 65, left: 50},
    width = 1400 - margin.left - margin.right,
    height = 750 - margin.top - margin.bottom;

// create intial svg
let svg = d3.select("#stacked_bar")
    .append('svg')
    .attr('viewBox', `0 0 ${width + margin.left+ margin.right} ${height + margin.top + margin.bottom}`)
    .attr('style', `max-width: ${width + margin.left + margin.right}px;`)
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
//console.log(dataset);

// INPUT Handling //

//both can take the form of "Nationality", "Sex", "Age_group", "BMI_group", "Diversity_group"
//define defaults
var xAttr = "BMI_group"
var colorAttr = "BMI_group"

//draw initial graph with defaults
drawGraph(xAttr, colorAttr);

const options = ['BMI_group', 'Age_group', 'Diversity_group', 'Sex', 'Nationality', 'DNA_extraction_method']

//add options to html
const colorOption = d3.select('#colors');
colorOption.selectAll("option")
    .data(options)
    .enter()
    .append("option")
    .html(function(d) {return d.replace("_", " ").replace("_", " ");})

const xOption = d3.select('#x_axis');
xOption.selectAll("option")
    .data(options)
    .enter()
    .append("option")
    .html(function(d) {return d.replace("_", " ").replace("_", " ");})

const content = d3.select('#content');
content.on('change', function(event) {
    if (event.target.id == "x_axis") {
        xAttr = event.target.value.replace(" ", "_").replace(" ", "_")
    } 

    else if (event.target.id == "colors"){
        colorAttr = event.target.value.replace(" ", "_").replace(" ", "_")
    }
    drawGraph(xAttr, colorAttr)
})

// sorting of objects based on the passd attribute, uses array-inidces for custom sorting.
function customSort(data=dataset, attribute) {

    let KeyOrder = 
        // sort by age, get dsitinct values from Age_group
        d3.sort(dataset,(a, b) => (a.Age > b.Age) ? 1 : -1).map(item => item['Age_group']).filter( (value, index, self) => self.indexOf(value) === index)
        // sort by Diversity, get Distinct values from Diversity_group
            .concat(d3.sort(dataset, (a, b) => (a.Diversity > b.Diversity) ? 1 : -1).map(item => item['Diversity_group']).filter( (value, index, self) => self.indexOf(value) === index))
        // implied sorting for catergorical values
            .concat(['underweight', 'lean', 'overweight', 'obese', 'severeobese', 'morbidobese', null, NaN])  

    //check if column of first object, holds true for all objects in theory since null-values are handeled
    // if (attribute in data[0]) {
    //     //uses the index
    //     return d3.sort(dataset, (a, b) => KeyOrder.indexOf(a[attribute]) - KeyOrder.indexOf(b[attribute]) || KeyOrder.indexOf(a[colorAttr]) - KeyOrder.indexOf(b[colorAttr]));
    // }
    // else {
    //     return d3.sort(dataset, (a, b) => a[attribute] - b[attribute] || a[colorAttr] - b[colorAttr]);
    // }

    if (attribute in data[0]) {
        //uses the index
        return d3.sort(dataset, a => KeyOrder.indexOf(a[attribute]) || KeyOrder.indexOf(a[colorAttr]) );
    }
    else {
        return d3.sort(dataset, a => a[attribute] || a[colorAttr]);
    }
}

function drawGraph(xAttr, colorAttr) {

    const identicalVars = (xAttr === colorAttr)
    dataset = customSort(dataset, xAttr)
    svg.html('');

    console.log(dataset, "data")

    // VARIABLES //


    // create map with nested maps
    // keys: X-Axis, values: maps of stacks: key-value
    let countMap = d3.rollup(dataset,
        v => v.length,
        key => key[xAttr], //(key[xAttr] == null) ? "Unknown" : 
        key => key[colorAttr]); //(key[colorAttr] == null) ? "Unknown" : 

    console.log(countMap, "CountMap")
    
    // temporarily create array to use filter
    countMap = new Map(
        [...countMap]
        .filter(([k, v]) => k != null ))
        
    console.log(countMap, "CountMap2")
    
    // convert map to array of objects of length 1
    // key: name on x-Axis, value: stacks for bar as map
    let countArray = Array.from(countMap, ([key, value]) => ({key, value}));
    console.log(countArray, "countArray")

    //https://stackoverflow.com/a/44444443/14276346
    //Loop through the nested array and create a new array element that converts each individual nested element into a key/value pair in a single object.
    let flatCountArray = [];
    countArray.forEach(function(d) {
    let obj = { Group: d.key } //old key -> value of 'Group'
        d.value.forEach(function(value, key) { //append key value pairs that were previously inside nested maps
            obj[key] = value;
        });
    flatCountArray.push(obj);
    });
    console.log(flatCountArray, "flatCountArray")

    // get array of values for color Attributes
    let colorKeys = customSort(dataset, colorAttr)
        .map(obj => obj[colorAttr]).filter(item => item != null)
        .filter( (value, index, self) => self.indexOf(value) === index)
    console.log(colorKeys, "colorKeys")

    // d3.stack automatically defines position for different items to be stacked
    // on top of each other
    let stack = d3.stack()
        .keys(colorKeys)
        // replace null values by 0
        .value((d, key) => (d[key] == null) ? 0 : d[key] )
        .order(d3.stackOrderReverse)
        .offset(d3.stackOffsetNone);

    // Y AXIS //

        // y scale
        let yScale = d3.scaleLinear()
            .domain([0, d3.max( //find max
                d3.rollup(dataset, //get counts as map-values
                value => value.length, //count occurences, output as map
                key => key[xAttr]) // (key[xAttr] == null) ? "Unknown" : 
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
            .text(xAttr.replace("_", " ").replace("_", ""))

    // DRAW BARS //

        // color palette = one color per subgroup, color value is the same as blue from tableau10
        let color = identicalVars ? () => "#4e79a7" : d3.scaleOrdinal().range(d3.schemeTableau10)

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
                    .attr("y", function (d) { return yScale(0); } ) // d[1] denotes end postion of stack
                    .attr("height", 0)

                    .attr("width", xScale.bandwidth())
                    .on("mousemove",(event,d) => {whileMouseOver(event,d)})
                    .on("mouseout",(event,d)  => {whileMouseOut(event,d)})
                    .style("opacity", "0.8")
                    .attr("stroke", "grey")
                    .transition()
                        .duration(400)
                        .ease(d3.easeLinear)
                        .attr("y", function (d) { return yScale(d[1]); } ) // d[1] denotes end postion of stack
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

        delete d.data['null']

    tooltip
        .style("visibility","visible")
        //d.data returns the values of the bar as a object
        .html(JSON.stringify(d.data)
            //write to string and format using regex & replace()
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

    console.log(stack(flatCountArray))

    //http://bl.ocks.org/gencay/4629518
    let legend = svg.selectAll("legend.colors")
        .data(colorKeys)
        .enter()
        .append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) { return "translate(0," + (15 + i * 25) + ")"; });

    legend.append("rect")
        .attr("x", width)
        .attr("width", 20)
        .attr("height", 20)
        .style("fill", color);

    legend.append("text")
        .attr("x", width - 5 )
        .attr("y", 10)
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text(function(d) { return d; });

    legend.style( 'visibility', identicalVars ? "hidden" : 'visible')

    svg.selectAll("legend.title")
        .data([0]) //empty data to draw only once
        .enter()
        .append("text")
        .attr("class", "title")
        .text(colorAttr.replace("_", " ").replace("_", " "))
        .attr("x", width + 20)
        .attr("y", 0)
        .style("text-anchor", "end")
        .style( 'visibility', identicalVars ? "hidden" : 'visible')
};
