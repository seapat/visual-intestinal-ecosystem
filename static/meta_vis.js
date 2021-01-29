const svgWidth = 600,
      svgHeight = 400,
      margin = {top: 30, right: 30, bottom: 100, left: 100},
      width = svgWidth - margin.left - margin.right,
      height = svgHeight - margin.top - margin.bottom,
      legendWidth = 200,
      legendHeight = 190,
      bar_color = d3.interpolateViridis(0.3),
      bar_color_sel = d3.interpolateViridis(0.5);
const keys = Object.keys(data[0]);

// create selections
const variable_choice = d3.select('#select_variable');
const variable_choice2 = d3.select('#select_variable2');

variable_choice.selectAll("option")
    .data(keys)
    .enter()
    .append("option")
    .html(function(d) {return d;})

variable_choice2.selectAll("option")
    .data(["---"].concat(keys))
    .enter()
    .append("option")
    .html(function(d) {return d;})

// when selection changes: update counts and chart
variable_choice.on('change', event => update());   
variable_choice2.on('change', event => update());

// Data wrangling
// define some bins and order of bins manually
let all_keys = {"Age": ["<21", "21-40", "41-60", "61-80", ">80"],
               "Diversity": ["very low", "low", "medium", "high", "very high"],
               "BMI group": ['underweight', 'lean', 'overweight', 'obese', 'severeobese', 'morbidobese']}
// complete all_keys
keys.map(function(k) { if (!Object.keys(all_keys).includes(k))
                                  all_keys[k] = d3.rollups(data.filter(d => d[k] != null), v => v, f => f[k]).map(r => r[0])
});

// Create ordinal scales for age and diversity
let age_bins = d3.scaleQuantize()
    .domain([0,101]).range(all_keys.Age);
let div_bins = d3.scaleQuantize()
    .domain([d3.min(data, d => d.Diversity),d3.max(data, d => d.Diversity)]).range(all_keys.Diversity);

// replace values of age and diversity with ordinal values
for (i=0; i<data.length; i++) {
    if (data[i].Age != null)
    data[i].Age = age_bins(data[i].Age);
    if (data[i].Diversity != null)
    data[i].Diversity = div_bins(data[i].Diversity);  
}

// group data and count occurences
function get_counts(variable1 = d3.select('#select_variable').node().value, variable2 = d3.select('#select_variable2').node().value) {
    let counts;
    
    if (variable2 == "---") {
        variable2 = variable1;
    }
     counts = d3.rollups(data.filter(b => b[variable1] != null && b[variable2] != null), v => v.length, f => f[variable1], f => f[variable2]);

    counts.map(function(d) {
        d[1] = d[1].sort((a, b) => all_keys[variable2].indexOf(a[0])-all_keys[variable2].indexOf(b[0]))
        for (i=0; i<d[1].length; i++) {
            if (i == 0)
                d[1][i] = [d[1][i][0], 0, d[1][i][1]];
            else
                d[1][i] = [d[1][i][0], d[1][i-1][2], d[1][i][1] + d[1][i-1][2]];
        }
    })
    counts.sort((a, b) => all_keys[variable1].indexOf(a[0])-all_keys[variable1].indexOf(b[0]));
    return counts
    }


// get max possible value on y axis 
let maxVal = d3.max(keys.map(k => get_counts(k, "---")), d => d3.max(d, a => a[1][0][2]));


// initialize scales
let scaleY = d3.scaleLinear().domain([0, maxVal+10]).range([height, 0]),
    scaleX = d3.scaleBand().range([0, width]).padding(0.2);
//.domain(all_keys[d3.select('#select_variable').node().value])

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
//  .call(d3.axisBottom(scaleX));

svg.append("text")
  .attr("transform", "translate(" + (margin.left/2) + " ," +
                       (height/2 + margin.top) + ")rotate(-90)")
  .text("Number of subjects")
  .style("text-anchor", "middle");

svg.append("text")
    .attr("transform", "translate(" + (margin.left + width/2) + " ," +
                   (margin.top + height + margin.bottom/2) + ")")
    .attr("id", "x_label")
    .style("text-anchor", "middle");

var tooltip = svg
    .append("text")
    .attr("id", "tooltip")
    .style("visibility", "hidden")
    .style("text-anchor", "middle");

var legend = d3.select("#legend").append("svg")
        .attr("width", legendWidth)
        .attr("class", "bg");
        

//
function update(variable1, variable2) {
    let counts = get_counts();
//    console.log(counts)
    variable1 = d3.select('#select_variable').node().value
    variable2 = d3.select('#select_variable2').node().value

    color = d3.scaleOrdinal()
    .unknown(bar_color)
    legend.style("visibility", "hidden");
    if (variable2 != "---") {
        color
        .range(d3.schemeCategory10)
        .domain(all_keys[variable2]);
        legend.style("visibility", "visible")
            .attr("height", 10 + color.domain().length*30);
        legend_rects = legend.selectAll("rect")
            .data(color.domain())
        legend_rects.enter()
            .append("rect")
            .merge(legend_rects)
            .attr("fill", d => color(d))
            .attr("width", 20)
            .attr("height", 20)
            .attr("transform", function(d) { let n = color.domain().indexOf(d); 
                                            return "translate(" + 10 + "," + (10+n*30) + ")" ;
                                           })
        legend_rects.exit().remove();
        legend_labels = legend.selectAll("text")
            .data(color.domain())
        legend_labels.enter()
            .append("text")
            .merge(legend_labels)
            .style("text-anchor", "start")
            .attr("dx", 40)
            .attr("dy", function(d) { let n = color.domain().indexOf(d); 
                                            return (25+n*30);
                                           })
            .text(function (d) {return d});
        legend_labels.exit().remove();
    } 

    // update x Axis
    scaleX.domain(all_keys[variable1]);
    xAxis.call(d3.axisBottom(scaleX))
    svg.select("#x_label")
        .text(variable1);
    // create groups for stacked bars
    let groups_data = svg.selectAll("g.group")
        .data(counts);
        groups = groups_data.enter()
        .append("g")
        .attr("class", "group")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .merge(groups_data)
//        .transition()
//        .duration(1000)
        .attr("x", function(d) { return scaleX(d[0]); });
        groups_exit = groups_data.exit()
        .remove();
    let bars_stacked = groups.selectAll("rect")
        .data(function(d) { return d[1]; })
        .join(
        enter => enter.append("rect")
        .on("mouseover", mouseOver)
        .on("mouseout", mouseOut)
//        .transition()
//        .duration(1000)
        .attr("x", function(d) { return d3.select(this.parentNode).attr("x"); })
        .attr("y", function(d) { return scaleY(d[2]); })
        .attr("width", scaleX.bandwidth())
        .attr("height", function(d) {  return height - scaleY(d[2]-d[1]); })
        .style("fill", function(d) {
            return color(d[0]);
    }),
        update => update.attr("x", function(d) { return d3.select(this.parentNode).attr("x"); })
        .on("mouseover", mouseOver)
        .on("mouseout", mouseOut)
//        .transition()
//        .duration(1000)
        .attr("y", function(d) { return scaleY(d[2]); })
        .attr("width", scaleX.bandwidth())
        .attr("height", function(d) { return height - scaleY(d[2]-d[1]); })
        .style("fill",function(d) {
            return color(d[0]);
    }),
        exit => exit.remove()
    );
    }

function mouseOut(m, d){
    d3.select(this).style("fill", color(d[0]));
    tooltip.style("visibility", "hidden");
}


function mouseOver(m, d){
    let x = +d3.select(this.parentNode).attr("x");
    let value = d[2]-d[1]
    let y = d3.min(d3.select(this.parentNode).selectAll("rect").nodes(), d => d.y.baseVal.value);
//    console.log(d3.select(this.parentNode).selectAll("rect").nodes())
    d3.select(this).style("fill", d3.rgb(color(d[0])).brighter(0.5));
    tooltip.style("visibility", "visible")
        .attr("transform", "translate(" + (x + margin.left + scaleX.bandwidth()/2) + " ," + (y + margin.top - 20 ) + ")")
    .text(value);

}

//
update();
