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

// reference mean
const REFERENCE_MEAN_OPTIONS = [
  {
    name:'species mean (comp. to group avg.)',
    tileset:'species_difference'
  }, {
    name: 'group mean (comp. to species avg.)',
    tileset: 'group_difference'
  }
];

// ####  global vars: dropdown choices
let TILESET = REFERENCE_MEAN_OPTIONS[0].tileset;
let GROUP = GROUPS[0];

// #### dropdown for choosing grouping ####
const grouping_choice = d3.select('#select_grouping');
GROUPS.map(g =>
  grouping_choice.append('option')
    .attr('value', g.name)
    .html(g.name)
);
grouping_choice.on('change', event => {
  GROUP = GROUPS.filter(g => g.name == event.target.value)[0];
  paint_group(GROUP, TILESET);
});

// #### dropdown for choosing reference mean
const reference_mean_choice = d3.select('#select_reference_mean');
REFERENCE_MEAN_OPTIONS.map(o =>
  reference_mean_choice.append('option')
    .attr('value', o.tileset)
    .html(o.name)
);
reference_mean_choice.on('change', event => {
  TILESET = event.target.value;
  paint_group(GROUP, TILESET);
});


// #### preprocessing (groupings) ####

// create distinct groups from continuous data
function generate_groups(data, field, amount) {
  const min = d3.min(data, d => d[field]);
  const max = d3.max(data, d => d[field]);
  const ticks = d3.ticks(min, max, amount);
  function get_group(f) {
    if (f < ticks[0]) return `0-${ticks[0]}`; //`${min}-${ticks[0]}`;
    for(let i = 1; i < ticks.length; i++) {
      if (f < ticks[i]) return `${ticks[i-1]}-${ticks[i]}`;
    }
    return `${ticks[ticks.length - 1]}+`; //`${ticks[ticks.length - 1]}-${max}`;
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
  // get an array of objects containing group name and possible values = categories
  const groups = group_names.map(by => make_group(by));

  // manually order bmi group - unknown bmi groups get sorted first
  if (group_names.includes('BMI_group')) {
    const bmi_group_order = [
      'underweight', 'lean', 'overweight', 'obese', 'severeobese', 'morbidobese'
    ];
    groups.filter(g => g.name == 'BMI_group')[0].categories.sort((a, b) => {
      return bmi_group_order.findIndex(x => x == a) - bmi_group_order.findIndex(y => y == b);
    });
  }

  // pre-calculate heatmap tile values for each grouping
  groups.map(group => {
    // generate d3.arc() generators for tiles of each category
    generate_tile_rings(group.categories);

    // #### calculate normalized heatmap values

    // create arrays with data for each category
    const grouped_data = d3.group(DATA, d => d[group.name]);
    group.categories.map(c =>
      c.sample_size = grouped_data.get(c.name).length
    );

    // calculate mean differences per group and species

    // ## difference from species mean compared to group average
    // mean differences across graph
    const species_differences = [];

    // initialize map
    group.categories.map(c => c.species_difference = {});

    // loop species, then groups for difference to species mean
    SPECIES.map(s => {
      const species_mean = d3.mean(DATA, d => d[s]);
      group.categories.map(c => {
        c.species_difference[s] = d3.mean(
          grouped_data.get(c.name),
          r => r[s]
        ) - species_mean;
        // species_differences.push(c.species_difference[s]);
      });
    });
    // difference to group average
    group.categories.map(c => {
      const group_mean = d3.mean(
        SPECIES.map(s => c.species_difference[s])
      );
      SPECIES.map(s => {
        c.species_difference[s] = c.species_difference[s] - group_mean;
        species_differences.push(c.species_difference[s]);
      });
    });

    // ## difference from group mean compared to species average
    // mean differences across graph
    const group_differences = [];

    // loop groups, then species for difference to group mean
    group.categories.map(c => {
      // initialize map
      c.group_difference = {};

      const group = grouped_data.get(c.name);
      const group_mean = d3.mean(
        SPECIES.flatMap(s => group.map(g => g[s]))
      );
      SPECIES.map(s => {
        c.group_difference[s] = d3.mean(group, r => r[s]) - group_mean;
        // group_differences.push(c.group_difference[s]);
      });
    });
    // difference to species average
    SPECIES.map(s => {
      const species_mean = d3.mean(group.categories.map(c => c.group_difference[s]));
      group.categories.map(c => {
        c.group_difference[s] = c.group_difference[s] - species_mean;
        group_differences.push(c.group_difference[s]);
      });
    });

    function normalize_across_graph(tileset, means) {
      // calculate value min and range across whole heatmap
      const min_mean = d3.min(means);
      const mean_range = d3.max(means) - min_mean;

      // normalize calculated mean differences
      SPECIES.map(s => {
        group.categories.map(c => {
          c[tileset][s] = (c[tileset][s] - min_mean)/mean_range;
        })
      });

      // since we scaled from 0 to 1, but we have diverging values, it is good to
      // know where the 0 is (because with normalization, it does not have to be 0,5)
      group[tileset] = { scaled_zero: (0 - min_mean)/mean_range };
    }
    normalize_across_graph('species_difference', species_differences);
    normalize_across_graph('group_difference', group_differences);


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
function paint_group(group, tileset) {
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
      .text(`${c.name} (${c.sample_size})`);
  });

  // paint color legend
  const color_legend = svg.append('g')
    .attr('transform', `translate(${INNER_RADIUS + RING_RADIUS - LEGEND_TILE_WIDTH}, ${- INNER_RADIUS - RING_RADIUS})`);
  const steps = [
    {value: 0, name: 'lowest'},
    {value: group[tileset].scaled_zero / 2, name: ''},
    {value: group[tileset].scaled_zero, name: 'average'},
    {value: group[tileset].scaled_zero + ((1 - group[tileset].scaled_zero) / 2), name: ''},
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
    const species = d.data;
    // paths come first: important for css styling
    const piece = svg.append('g');

    // paint heatmap tiles for species
    group.categories.map(cat => {
      piece.append('path')
         .attr('fill', d3.interpolateViridis(cat[tileset][species]))
         .attr('d', cat.ring(d))
         .attr('class', 'heatmap_tile')
         .append('title')
         .text(`${cat.name} (${cat.sample_size} Samples)`);
    });

    // paint legend for species
    piece.append('text')
       .attr('class', 'species_label')
       .attr('transform', `translate(${outer_circle.centroid(d).join(',')}) rotate(${rad2dgr(d3.mean([d.startAngle, d.endAngle])) - 90})`)
       .text(species);
  });

}

// ##### create initial graph ####
paint_group(GROUP, TILESET);
