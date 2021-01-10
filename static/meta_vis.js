const svgWidth = 500,
      svgHeight = 400,
      margin = {top: 30, right: 30, bottom: 50, left: 50},
      width = svgWidth - margin.left - margin.right,
      height = svgHeight - margin.top - margin.bottom;
      
// initialize scales using Age
let age = data.Age
let maxVal = d3.max(Object.values(data), a => d3.max(a, b => b.value));
/* max value: max samples?
let maxVal = d3.max(Object.values(data).map(d => d3.sum(d.map(a => a.value))));
*/

let scaleY = d3.scaleLinear().domain([0, maxVal+10]).range([height, 0]),
    scaleX = d3.scaleBand().range([ 0, width]).domain(age.map(function(d) { return d.label; })).padding(0.2);


const variable_choice = d3.select('#select_variable');

variable_choice.selectAll("option")
    .data(Object.keys(data))
    .enter()
    .append("option")
    .html(function(d) {return d;})

variable_choice.on('change', event => update(event.target.value));


// create chart
let svg = d3.select("#meta_vis")
  .append("svg")
  .attr("width", svgWidth)
  .attr("height", svgHeight)
  .attr("class", "bg");


svg.append("rect")
    .attr("x", margin.left)
    .attr("y", margin.top)
    .attr("width", width)
    .attr("height", height)
    .attr("class", "chart");

let yAxis = svg.append("g")
  .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
  .call(d3.axisLeft(scaleY));

let xAxis = svg.append("g")
  .attr("transform", "translate(" + margin.left + "," + (margin.top + height) + ")")
  .call(d3.axisBottom(scaleX));

// append g element for bars
svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .attr("id", "bars");

function update(variable) {
    // update x Axis
    scaleX.domain(data[variable].map(function(d) { return d.label; }))
    xAxis.call(d3.axisBottom(scaleX))
        let bars = svg.select("#bars").selectAll("rect.bar")
        .data(data[variable])
        bars.enter()
        .append("rect")
        .attr("class", "bar")
        .merge(bars)
        .transition()
        .duration(1000)
        .attr("x", function(d) { return scaleX(d.label); })
        .attr("y", function(d) { return scaleY(d.value); })
        .attr("width", scaleX.bandwidth())
        .attr("height", function(d) { return height - scaleY(d.value); })
//        .attr("fill", d3.interpolateViridis(0.5))
        bars.exit()
        .remove()
    }

update("Age");