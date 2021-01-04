// const data = {{ jsonTable | safe }};
// const species = {{ species | safe }};

// drawing constants
const INNER_RADIUS = 350;
const MARGIN_Y = 0;
const MARGIN_X = 0;
const SVG_X = (INNER_RADIUS + MARGIN_X) * 2;
const SVG_Y = (INNER_RADIUS + MARGIN_Y) * 2;

// helper function for rotating text
function rad2dgr(radians) {
  return radians * (180 / Math.PI);
}

// prepare canvas
const svg = d3.select('#heat_wheel')
  .attr('width', SVG_Y)
  .attr('height', SVG_X)
  .attr('text-anchor', 'end') // right-align text fields
  .attr('font-family', 'sans-serif')
  .append('g')
  .attr('transform', `translate(${SVG_Y / 2},${SVG_X / 2})`); // start drawing from the middle

// pie chart needed for calculating angles
const bacteria_angles = d3.pie().value(d => 1)(species);

// arc needed to compute positions for the legend
const outer_circle = d3.arc()
  .innerRadius(0)
  .outerRadius(INNER_RADIUS * 2);

// create graph
bacteria_angles.map(d => {
  svg.append('text')
     .attr('fill', 'black')
     .attr('transform', `translate(${outer_circle.centroid(d).join(',')}) rotate(${rad2dgr(d.startAngle) - 90})`)
     .attr('font-size', 10)
     .text(d.data);
});
