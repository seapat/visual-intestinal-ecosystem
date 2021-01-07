// const DATA = {{ jsonTable | safe }};
// const SPECIES = {{ species | safe }};

// #### drawing constants ####
const INNER_RADIUS = 350;
const RING_RADIUS = 50;
const RING_PADDING = 1;
const PAD_ANGLE = 0.005;
const SVG_X = (INNER_RADIUS + RING_RADIUS) * 2;
const SVG_Y = (INNER_RADIUS + RING_RADIUS) * 2;

add_age_groups(DATA);
const GROUPS = preprocess_groups(
  ['BMI_group', 'Age_group', 'Sex', 'Nationality', 'DNA_extraction_method']
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

// adding age group fields to data
function group_age(a) {
  if (a < 18) {
    return '0-17';
  } else if (a < 28) {
    return '18-27';
  // } else if (a < 38) {
  //   return '28-37';
  } else if (a < 48) {
    return '28-47';
  // } else if (a < 58) {
  //   return '48-57';
  } else if (a < 68) {
    return '48-67';
  // } else if (a < 78) {
  //   return '68-77';
  } else if (a < 88) {
    return '68-87';
  } else {
    return '>=88';
  }
}
function add_age_groups(data) {
  data.map(d => d.Age_group = group_age(d.Age));
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
    categories[i] = {
      name: categories[i],
      ring: d3.arc()
      .innerRadius(INNER_RADIUS + (i / categories.length) * RING_RADIUS + RING_PADDING)
      .outerRadius(INNER_RADIUS + ((i + 1) / categories.length) * RING_RADIUS)
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
