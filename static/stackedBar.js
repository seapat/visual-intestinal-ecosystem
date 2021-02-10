//Sean Klein 5575709

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

//define initial values
var xAttr = "BMI_group"
var colorAttr = "BMI_group"

// prepare graph
// x-scale, axis and label
let xScale = d3.scaleBand()
            .range([0, width])
            .padding(0.5);
svg.append("g").attr("id", "x_axis_g")
        .attr("transform", "translate(0," + height + ")")
svg.append("text").attr("id", "x_label")
    .attr("text-anchor", "end")
    .attr("x", width)
    .attr("y", height + 50 )
// y-scale, axis and label
let yScale = d3.scaleLinear()
            .range([ height, 0]);
svg.append("g").attr("id", "y_axis_g");
svg.append("text")
    .attr("text-anchor", "start")
    .attr("x", -20 )
    .attr("y", -20 )
    .text("Subjects")
// legend
svg.append("g").attr("id", "legend").append("text").attr("id", "legend_title").attr("x", width + 20).attr("y", 0).style("text-anchor", "end");

//draw initial graph with defaults
drawGraph(xAttr, colorAttr);

function drawGraph(xAttr, colorAttr) {

    const variablesIdentical = (xAttr === colorAttr)
//    svg.html('');
    
     let KeyOrder = 
        // sort by age, get dsitinct values from Age_group
        d3.sort(dataset,(a, b) => (a.Age > b.Age) ? 1 : -1).map(item => item['Age_group']).filter( (value, index, self) => self.indexOf(value) === index)
        // sort by Diversity, get Distinct values from Diversity_group
            .concat(d3.sort(dataset, (a, b) => (a.Diversity > b.Diversity) ? 1 : -1).map(item => item['Diversity_group']).filter( (value, index, self) => self.indexOf(value) === index))
        // implied sorting for catergorical values
            .concat(['underweight', 'lean', 'overweight', 'obese', 'severeobese', 'morbidobese', null, NaN])  

     
     // .filter(x => x[xAttr] != null && x[colorAttr] != null)
    let barHeights = d3.rollups(dataset, v => v.length, f => f[xAttr], f => f[colorAttr])
        .map(c => {return Object.assign({"Group": c[0]}, ...c[1].sort((a, b) =>  KeyOrder.indexOf(a[0]) > -1 ? KeyOrder.indexOf(a[0])-KeyOrder.indexOf(b[0]) : d3.ascending(a[0], b[0]))
                                        .map(x => ({[x[0]]: x[1]})))})
        .sort((a, b) => KeyOrder.indexOf(a.Group) > -1 ? KeyOrder.indexOf(a.Group)-KeyOrder.indexOf(b.Group) : d3.ascending(a.Group, b.Group))
        .filter(x => x.Group != null);
    
    let vertOrder = d3.groups(
        dataset.filter(x => x[colorAttr] != null), f => f[colorAttr]).map(g => g[0])
        .sort((a, b) =>  KeyOrder.indexOf(a) > -1 ? KeyOrder.indexOf(a)-KeyOrder.indexOf(b) : d3.ascending(a, b))

    let horOrder = barHeights.map(c => c.Group);
    
    let stack = d3.stack()
        .keys(vertOrder)
        // replace null values by 0
        .value((d, key) => (d[key] == null) ? 0 : d[key] )
        .order(d3.stackOrderReverse)
        .offset(d3.stackOffsetNone);

    // Y AXIS //
        // y scale
        yScale.domain([0, d3.max( //find max
                d3.rollup(dataset, //get counts as map-values
                value => value.length, //count occurences, output as map
                key => key[xAttr]) // (key[xAttr] == null) ? "Unknown" : 
                .values()) ]); //iterate over value

        // y ticks
        svg.select("#y_axis_g")
            .call(d3.axisLeft()
            .scale(yScale));

    // X AXIS //

        // x scale
        xScale.domain(horOrder)

        // x ticks
        svg.select("#x_axis_g")
            .call(d3.axisBottom()
            .scale(xScale));

        // x axis label
        svg.select("#x_label")
            .text(xAttr.replace("_", " ").replace("_", ""))

    // DRAW BARS //
    
    let color = variablesIdentical ? () => "#4e79a7" : d3.scaleOrdinal().range(d3.schemeTableau10)
    let stacks = svg.selectAll(".layer")
        .data(stack(barHeights))
    stacks.exit().selectAll(".bar").transition().duration(400).ease(d3.easeLinear).attr("y", yScale(0)).attr("height", 0).remove()
    stacks = stacks.enter().append("g").attr("class", "layer")
        .merge(stacks).attr("fill", function(d) { return color(d.key); })
    
    let bars = stacks
        .selectAll(".bar")
        .data(function(d) { return d; });
    bars.exit().remove();
    bars.enter()
        .append("rect").attr("class", "bar")
        .attr("x", function (d) { return xScale(d.data.Group);}) // "Group" is acessor of Strings for x-axis
        .attr("y", function (d) { return yScale(0); } ) // d[1] denotes end postion of stack
        .attr("height", 0)
        .attr("width", xScale.bandwidth())
        .on("mousemove",(event,d) => {whileMouseOver(event,d)})
        .on("mouseout",(event,d)  => {whileMouseOut(event,d)})
        .style("opacity", "0.8")
        .attr("stroke", "grey")
        .merge(bars)
        .transition()
        .duration(400)
        .attr("width", xScale.bandwidth())
        .ease(d3.easeLinear)
        .attr("x", function (d) { return xScale(d.data.Group);}) // "Group" is acessor of Strings for x-axis
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
    //http://bl.ocks.org/gencay/4629518
    
     let legend = svg.select("#legend").selectAll(".legend_entry")
        .data(function() {return vertOrder})
    legend.exit().remove();
    let entries = legend.enter()
        .append("g")
        .attr("class", "legend_entry")
        .attr("transform", function(d, i) { return "translate(0," + (15 + i * 25) + ")"; })
        .merge(legend)
    let rects = entries.selectAll(".legendrect")
        .data(function(d) {return [d];})
    rects.enter().append("rect").attr("class", "legendrect")
        .attr("x", width)
        .attr("width", 20)
        .attr("height", 20)
        .merge(rects)
        .style("fill", d => {return color(d)});
    let labels = entries.selectAll(".legendlabel")
        .data(function(d) {return [d];})
    labels.enter().append("text").attr("class", "legendlabel")
        .attr("x", width - 5 )
        .attr("y", 10)
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .merge(labels)
        .text(function(d) { return d; });

    svg.select("#legend").style( 'visibility', variablesIdentical ? "hidden" : 'visible')
    svg.select("#legend_title").text(colorAttr.replace("_", " ").replace("_", " "))

};
