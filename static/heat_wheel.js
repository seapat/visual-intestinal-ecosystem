// const DATA = {{ jsonTable | safe }};
// const SPECIES = {{ species | safe }};

// #### drawing constants ####
const INNER_RADIUS = 350;
const RING_RADIUS = 70;
const RING_PADDING = 1;
const PAD_ANGLE = 0.005;
const Y_PADDING = 50;
const X_PADDING = 10;
const SVG_X = (INNER_RADIUS + RING_RADIUS + X_PADDING) * 2;
const SVG_Y = (INNER_RADIUS + RING_RADIUS + Y_PADDING) * 2;

// color legend
const LEGEND_TILE_WIDTH = 20;
const LEGEND_TILE_HEIGHT = 10;
const LEGEND_TILE_PADDING = 5;

// data
generate_groups(DATA, 'Age', 4);
generate_groups(DATA, 'Diversity', 4);
const GROUPS = preprocess_groups(
  ['BMI_group', 'Age_group', 'Diversity_group', 'Sex', 'Nationality', 'DNA_extraction_method']
);

// #### dropdown for choosing grouping ####
const grouping_choice = d3.select('#select_grouping');
GROUPS.map(g =>
  grouping_choice.append('option')
    .attr('value', g.name)
    .html(g.name)
);
grouping_choice.on('change', event => paint_group(GROUPS.filter(g => g.name == event.target.value)[0]));

// #### preprocessing (groupings) ####

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

// getting distinct groups
function distinct(data, accessor) {
  return Array.from(d3.union(data.map(accessor))).filter(d => d);
}

// helper function for group preprocessing
function make_group(by) {
  return {
    name: by,
    categories: distinct(DATA, d => d[by]).sort()
  };
}

// heatmap tiles
function generate_tile_rings(categories) {
  for(let i = 0; i < categories.length; i++) {
    const startRadius = INNER_RADIUS + (i / categories.length) * RING_RADIUS + RING_PADDING;
    const endRadius = INNER_RADIUS + ((i + 1) / categories.length) * RING_RADIUS;
    categories[i] = {
      name: categories[i],
      ring: d3.arc().innerRadius(startRadius).outerRadius(endRadius),
      startRadius: startRadius,
      endRadius: endRadius
    };
  }
}

// unified group preprocessing
function preprocess_groups(group_names) {
  const groups = group_names.map(by => make_group(by));

  // manually order some categories - HACKY!
  if (group_names.includes('BMI_group')) {
    groups.filter(g => g.name == 'BMI_group')[0].categories = [
      'underweight', 'lean', 'overweight', 'obese', 'severeobese', 'morbidobese'
    ];
  }

  groups.map(group => {
    generate_tile_rings(group.categories);
    // calculate normalized heatmap values
    const means = [];
    const grouped_data = d3.group(DATA, d => d[group.name]);
    SPECIES.map(s => {
      const species_mean = d3.mean(DATA, d => d.Bacteria[0][s]);
      group.categories.map(c => {
        c[s] = d3.mean(
          grouped_data.get(c.name),
          r => r.Bacteria[0][s]
        ) - species_mean;
        means.push(c[s]);
      });
    });
    const min_mean = d3.min(means);
    const mean_range = d3.max(means) - min_mean;
    SPECIES.map(s => {
      group.categories.map(c => {
        c[s] = (c[s] - min_mean)/mean_range;
      })
    });
    group.scaled_zero = (0 - min_mean)/mean_range;
  });
  return groups;
}

// #### graph prerequisites ####
// prepare canvas
const svg = d3.select('#heat_wheel')
  .attr('width', SVG_Y)
  .attr('height', SVG_X)
  .attr('text-anchor', 'end') // right-align text fields
  .attr('font-family', 'sans-serif')
  .append('g')
  .attr('transform', `translate(${SVG_Y / 2},${SVG_X / 2})`); // start drawing from the middle

// helper function for rotating text
function rad2dgr(radians) {
  return radians * (180 / Math.PI);
}

// pie chart needed for calculating angles
const bacteria_angles = d3.pie()
  .padAngle(PAD_ANGLE)
  .value(d => 1)(SPECIES);

// arc needed to compute positions for the legend
const outer_circle = d3.arc()
  .innerRadius(0)
  .outerRadius(INNER_RADIUS * 2);

// ##### graph creator ####
function paint_group(group) {
  // clear graph
  svg.html('');

  // paint ring legend
  group.categories.map(c => {
    svg.append('line')
      .attr('y1', - c.startRadius)
      .attr('y2', - c.startRadius)
      .attr('x1', 0)
      .attr('x2', - INNER_RADIUS)
      .attr('stroke', 'black')
      .attr('stroke-dasharray', ('2,2'));

    svg.append('text')
      .attr('y', - c.startRadius)
      .attr('x', - INNER_RADIUS)
      .attr('class', 'group_label')
      .text(c.name);
  });

  // paint color legend
  const color_legend = svg.append('g')
    .attr('transform', `translate(${INNER_RADIUS + RING_RADIUS - LEGEND_TILE_WIDTH}, ${- INNER_RADIUS - RING_RADIUS})`);
  const steps = [
    {value: 0, name: 'lowest'},
    {value: group.scaled_zero / 2, name: ''},
    {value: group.scaled_zero, name: 'average'},
    {value: group.scaled_zero + ((1 - group.scaled_zero) / 2), name: ''},
    {value: 1, name: 'highest'}
  ];
  for (let i = 0; i < steps.length; i++) {
    const y_pos = (LEGEND_TILE_HEIGHT + LEGEND_TILE_PADDING) * i;
    color_legend.append('rect')
      .attr('y', y_pos)
      .attr('width', LEGEND_TILE_WIDTH)
      .attr('height', LEGEND_TILE_HEIGHT)
      .attr('fill', d3.interpolateViridis(steps[i].value))
      .append('title')
      .text(steps[i].name);
    color_legend.append('text')
      .attr('y', y_pos + LEGEND_TILE_HEIGHT)
      .attr('x', - LEGEND_TILE_PADDING)
      .text(steps[i].name)
      .attr('class', 'group_label');
  }

  // paint graph
  bacteria_angles.map(d => {
    // paths come first: important for css styling
    const piece = svg.append('g');
    group.categories.map(cat => {
      piece.append('path')
         .attr('fill', d3.interpolateViridis(cat[d.data]))
         .attr('d', cat.ring(d))
         .attr('class', 'heatmap_tile')
         .append('title')
         .text(cat.name);
    });

    piece.append('text')
       .attr('class', 'species_label')
       .attr('transform', `translate(${outer_circle.centroid(d).join(',')}) rotate(${rad2dgr(d.startAngle) - 90})`)
       .text(d.data);
  });

}

// ##### create initial graph ####
paint_group(GROUPS[0]);
