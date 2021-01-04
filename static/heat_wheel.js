// const data = {{ jsonTable | safe }};
// const species = {{ species | safe }};

// drawing constants
const INNER_RADIUS = 350;
const MARGIN_Y = 0;
const MARGIN_X = 0;
const SVG_X = (INNER_RADIUS + MARGIN_X) * 2;
const SVG_Y = (INNER_RADIUS + MARGIN_Y) * 2;

function rad2dgr(radians) {
  return radians * (180 / Math.PI);
}

const svg = d3.select('#heat_wheel')
  .attr('width', SVG_Y)
  .attr('height', SVG_X)
  .attr('text-anchor', 'end')
  .attr('font-family', 'sans-serif')
  .append('g')
  .attr('transform', `translate(${SVG_Y / 2},${SVG_X / 2})`);

const bacteria_positions = d3.pie().value(d => 1)(species);

const outer_circle = d3.arc()
  .innerRadius(0)
  .outerRadius(INNER_RADIUS * 2);

bacteria_positions.map(d => {
  svg.append('text')
     .attr('fill', 'black')
     .attr('transform', `translate(${outer_circle.centroid(d).join(',')}) rotate(${rad2dgr(d.startAngle) - 90})`)
     .attr('font-size', 10)
     .text(d.data);
});
