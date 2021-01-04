// const data = {{ jsonTable | safe }};
// const species = {{ species | safe }};

// drawing constants
const INNER_RADIUS = 350;
const RING_RADIUS = 50;
const RING_PADDING = 1;
const PAD_ANGLE = 0.005;
const SVG_X = (INNER_RADIUS + RING_RADIUS) * 2;
const SVG_Y = (INNER_RADIUS + RING_RADIUS) * 2;

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
const bacteria_angles = d3.pie()
  .padAngle(PAD_ANGLE)
  .value(d => 1)(species);

// arc needed to compute positions for the legend
const outer_circle = d3.arc()
  .innerRadius(0)
  .outerRadius(INNER_RADIUS * 2);

// heatmap tiles
function generate_tile_rings(categories) {
  for(let i = 0; i < categories.length; i++) {
    categories[i] = {
      name: categories[i],
      ring: d3.arc()
      .innerRadius(INNER_RADIUS + (i / categories.length) * RING_RADIUS + RING_PADDING)
      .outerRadius(INNER_RADIUS + ((i + 1) / categories.length) * RING_RADIUS)
    };
  }
}

// ##### create initial graph ####
const dummy_categories = ["test1", "test2", "test3", "test4", "test5"];
generate_tile_rings(dummy_categories);

bacteria_angles.map(d => {
  svg.append('text')
     .attr('fill', 'black')
     .attr('transform', `translate(${outer_circle.centroid(d).join(',')}) rotate(${rad2dgr(d.startAngle) - 90})`)
     .attr('font-size', 10)
     .text(d.data);
  dummy_categories.map(cat => {
    svg.append('path')
       .attr('fill', d3.interpolateMagma(Math.random()))//d3.avg(data, r => r['Bacteria'][0][d.data])))
       .attr('d', cat.ring(d))
       .attr('stroke', 'white')
       .attr('stroke-width', '2px');
  });
});
