// const DATA = {{ jsonTable | safe }};
// const SPECIES = {{ species | safe }};

// #### drawing constants ####
// heatmap
const INNER_RADIUS = 350;
const RING_RADIUS = 70;
const RING_PADDING = 1;
const PAD_ANGLE = 0.005;
const PAD_WIDTH = 50;
const PAD_HEIGHT = 10;
const HEATMAP_HEIGHT = (INNER_RADIUS + RING_RADIUS + PAD_HEIGHT) * 2;
const HEATMAP_WIDTH = (INNER_RADIUS + RING_RADIUS + PAD_WIDTH) * 2;

const LEGEND_TILE_WIDTH = 20;
const LEGEND_TILE_HEIGHT = 10;
const LEGEND_TILE_PADDING = 5;

// histograms
const HIST_X = 200;
const HIST_Y = 200;
const HIST_MAR_X = 60;
const HIST_MAR_Y = 80;



// data
generate_groups(DATA, 'Age', 4);
generate_groups(DATA, 'Diversity', 4);
const GROUPS = preprocess_groups(
  ['BMI_group', 'Age_group', 'Diversity_group', 'Sex', 'Nationality', 'DNA_extraction_method']
);

// reference mean
const REFERENCE_MEAN_OPTIONS = [
  {
    name:'species mean',
    tileset:'species_difference'
  }, {
    name:'species mean (comp. to group avg.)',
    tileset:'species_difference_ga'
  }, {
    name: 'group mean',
    tileset: 'group_difference'
  }, {
    name: 'group mean (comp. to species avg.)',
    tileset: 'group_difference_sa'
  }
];

// ####  global vars: dropdown choices and clicked tiles #####
let TILESET = REFERENCE_MEAN_OPTIONS[0].tileset;
let GROUP = GROUPS[0];
let SELECTED = null;

// #### dropdown for choosing grouping ####
const grouping_choice = d3.select('#select_grouping');
GROUPS.map(g =>
  grouping_choice.append('option')
    .attr('value', g.name)
    .html(g.name)
);
grouping_choice.on('change', event => {
  GROUP = GROUPS.filter(g => g.name == event.target.value)[0];
  create_heatmap(GROUP, TILESET);
  HIST = drawHist();
  if (SELECTED) updateHist(SELECTED);
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
  create_heatmap(GROUP, TILESET);
  if (SELECTED) updateHist(SELECTED);
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

    // ## difference from species mean (optionally compared to group average)
    // array for global normalization and initialization of maps
    const species_differences = [];
    group.categories.map(c => c.species_difference = {});
    // loop species, then groups for difference to species mean
    SPECIES.map(s => {
      const species_mean = d3.mean(DATA, d => d[s]);
      group.categories.map(c => {
        c.species_difference[s] = d3.mean(
          grouped_data.get(c.name),
          r => r[s]
        ) - species_mean;
        species_differences.push(c.species_difference[s]);
      });
    });

    // difference to group average
    // array for global normalization
    const species_differences_ga = [];
    // loop groups, difference to avg. group difference
    group.categories.map(c => {
      c.species_difference_ga = {};
      const group_mean = d3.mean(
        SPECIES.map(s => c.species_difference[s])
      );
      SPECIES.map(s => {
        c.species_difference_ga[s] = c.species_difference[s] - group_mean;
        species_differences_ga.push(c.species_difference_ga[s]);
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
        group_differences.push(c.group_difference[s]);
      });
    });
    // difference to species average
    const group_differences_sa = [];
    group.categories.map(c => c.group_difference_sa = {});
    SPECIES.map(s => {
      const species_mean = d3.mean(group.categories.map(c => c.group_difference[s]));
      group.categories.map(c => {
        c.group_difference_sa[s] = c.group_difference[s] - species_mean;
        group_differences_sa.push(c.group_difference_sa[s]);
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
    normalize_across_graph('species_difference_ga', species_differences_ga);
    normalize_across_graph('group_difference', group_differences);
    normalize_across_graph('group_difference_sa', group_differences_sa);


  });
  return groups;
}

// #### graph prerequisites ####
// prepare canvas
const svg = d3.select('#heat_wheel')
  .attr('style', `max-width: ${HEATMAP_WIDTH}px;`)
  // .attr('height', HEATMAP_HEIGHT)
  .attr('viewBox', `0 0 ${HEATMAP_WIDTH} ${HEATMAP_HEIGHT}`)
  .attr('text-anchor', 'end') // right-align text fields
  .attr('font-family', 'sans-serif')
  .append('g')
  .attr('transform', `translate(${HEATMAP_WIDTH / 2},${HEATMAP_HEIGHT / 2})`); // start drawing from the middle

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

// prepare for histograms
let svg_hist_width = 2 * (HIST_X + 1.75*HIST_MAR_X)
const svg_hist = d3.select('#histograms')
  // .attr('width', svg_hist_width)
  .attr('style', `max-width: ${svg_hist_width}px;`)
  .attr("class", "histsbg");
svg_hist.append("text")
  .attr("id", "histtitle")
  .style("text-anchor", "middle")
  .attr('transform', `translate(${svg_hist_width/2},${30})`);
//var scaleX = d3.scaleLog()
//            .domain([0.1, 1])
//            .range([0, HIST_X]).clamp(true);
var scaleX = d3.scaleLinear()
            .domain([0, 1])
            .range([0, HIST_X]);

var scaleY = d3.scaleLinear()
            .domain([0, 100])
            .range([HIST_Y, 0]);
let HIST = drawHist();

// show bars if checkbox is activated
d3.select("#showbars").on("change",show_bars);

function show_bars() {
    if (d3.select("#showbars").property("checked")){
        console.log(HIST.selectAll(".bar"));
					HIST.selectAll(".bar").style("visibility", "visible");
				} else {
					HIST.selectAll(".bar").style("visibility", "hidden");
				}
}


// function for drawing histograms (except bars/density)
function drawHist() {
    cat_count = GROUP.categories.length
    reversed_data = [...GROUP.categories].reverse() // reverse data to match order in heatwheel
    height = HIST_MAR_Y + (cat_count/2).toFixed()*(HIST_Y + HIST_MAR_Y);
    let hist = svg_hist
      .attr('viewBox', `0 0 ${svg_hist_width} ${height}`)
      // .attr('height', height)
      .selectAll(".hist_group")
      .data(reversed_data);
    hist.exit().remove();
    let enter = hist.enter()
      .append("g")
      .attr("class", "hist_group");
    enter.append("rect")
      .attr("class", "histbg")
      .attr("width", HIST_X)
      .attr("height", HIST_Y);
    enter.append("text")
      .attr("class", "histlabel")
      .style("text-anchor", "middle")
      .attr('alignment-baseline', 'bottom')
      .attr('transform', `translate(${HIST_X/2},${-5})`);
    enter.append("text")
      .attr("class", "axislabel")
      .style("text-anchor", "middle")
      .attr('alignment-baseline', 'middle')
      .attr('transform', `translate(${-40},${HIST_Y/2})rotate(-90)`)
      .text("Percentage of subjects");
    enter.append("text")
      .attr("class", "axislabel")
      .style("text-anchor", "middle")
      .attr('alignment-baseline', 'middle')
      .attr('transform', `translate(${HIST_X/2},${HIST_Y+30})`)
      .text("Abundance");
    enter.append("g")
      .attr("class", "yaxis")
      .call(d3.axisLeft(scaleY));
    enter.append("g")
      .attr("class", "xaxis")
      .attr('transform', `translate(${0},${HIST_Y})`)
      .call(d3.axisBottom(scaleX));
//  tickFormat(d => {var log = Math.log(d) / Math.LN10; return Math.abs(Math.round(log) - log) < 1e-6 ? Math.round(log) : ''}));
    hist = hist.merge(enter)
        .attr('transform', function(d, i) {
          return `translate(${HIST_MAR_X + (i%2)*(1.5*HIST_MAR_X + HIST_X)},${HIST_MAR_Y + (Math.trunc(i/2))*(HIST_Y + HIST_MAR_Y)})`
        });
    hist.select(".histlabel").text(function(d){return d.name});
    return hist;
}


// function for drawing bars of histograms
function updateHist(species) {
    // mark species in heatmap
    if (SELECTED) document.getElementById(`${SELECTED}_sector`).classList.remove('selected');
    SELECTED = species;
    document.getElementById(`${species}_sector`).classList.add('selected');

    // update histogram
    svg_hist.style("visibility", "visible");
    svg_hist.select("#histtitle").text(species);
    reversed_data = [...GROUP.categories].reverse();
    total_subjects = d3.sum(GROUP.categories, c => c.sample_size);
    group_data = reversed_data.map(c => {
      return {
        heatmap_val: c[TILESET][species],
        data: DATA.filter(d => d[GROUP.name] == c.name).map(d => d[species])
      };
    });

    thresholds = scaleX.ticks(50);

    function kde(kernel, thresholds, data) {
      return thresholds.map(t => [scaleX(t), d3.mean(data, d => scaleY(kernel(t - d)))]);
    }

    function gauss_kernel(length_scale) {
      return x => Math.exp(-Math.pow(x, 2)/(2*Math.pow(length_scale, 2)))*100;
    }

    // create density plot (area and line)
    let line = d3.line()
      .curve(d3.curveBasis);
    let area = d3.area().y0(HIST_Y);
    let length_scale = 0.05;


    let dist_area = HIST.data(group_data)
        .selectAll(".dist_area")
        .data(function(d, i) {
            density = kde(gauss_kernel(length_scale), thresholds, d.data);
            return [{ heatmap_val: d.heatmap_val, data:density }];
        });
    // console.log(dist_area);
    dist_area.enter()
        .append('path').attr('class', 'dist_area')
        .merge(dist_area)
        .transition()
        .duration(500)
        .attr('d', d => area(d.data))
        .attr('fill', d => d3.interpolateViridis(d.heatmap_val));

    let dist = HIST.data(group_data)
        .selectAll(".dist")
        .data(function(d, i) {
            density = kde(gauss_kernel(length_scale), thresholds, d.data)
            return [{ heatmap_val: d.heatmap_val, data: density }];
        })
    dist.enter()
        .append('path').attr('class', 'dist')
        .merge(dist)
        .transition()
        .duration(500)
        .attr('d', d => line(d.data))
        .attr('stroke', d => d3.interpolateViridis(d.heatmap_val));

    // create bars
    let create_hist = d3.histogram()
        .value(d => d)
        .domain(scaleX.domain())
        .thresholds(10);
    let bars = HIST.data(group_data)
        .selectAll(".bar")
        .data(function(d, i) {
            let bins = create_hist(d.data);
            bins.map(b => b["total"] = d3.sum(bins, b => b.length))
            bins.map(b => b["heatmap_val"] = d.heatmap_val);
            return bins;
        });
    bars.enter().append("rect")
      .attr('class', 'bar')
//    .attr("fill", d => d3.interpolateViridis(d.x0))
      .attr("x", d => scaleX(d.x0) + 2)
      .attr("y", d => {return HIST_Y})
      .attr("width", d => {return scaleX(d.x1) - scaleX(d.x0)-4})
      .attr("height", 0)
      .merge(bars)
      .transition()
      .duration(500)
      .attr("x", d => scaleX(d.x0) + 2)
      .attr("y", function(d) {return scaleY(d.length/d.total*100)})
      .attr("width", d => {return scaleX(d.x1) - scaleX(d.x0)-4})
      .attr("height", d => HIST_Y - scaleY(d.length/d.total*100))
      .attr("fill", d => d3.interpolateViridis(d.heatmap_val));

};

// ##### graph creator ####
function create_heatmap(group, tileset) {
  // clear graph
  svg.html('');

  // text field showing the name of currently hovered species
  const center_label = svg.append('text')
    .attr('id', 'center_label')
    .text('');

  // paint ring legend
  group.categories.map(c => {
    // o ---> y
    // |
    // |
    // v x
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
  steps.reverse();
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
  bacteria_angles.map((d, idx) => {
    const species = d.data;
    const piece = svg.append('g')
      .attr('id', `${species}_sector`)
      .attr('class', 'species_group')
      .on('mouseenter', () => center_label.text(species))
      .on('mouseleave', () => center_label.text(''));


    // legend comes first: important for css styling

    // paint legend for species
    piece.append('text')
      .attr('class', 'species_label')
      .attr('transform', `translate(${outer_circle.centroid(d).join(',')}) rotate(${rad2dgr(d3.mean([d.startAngle, d.endAngle])) - 90 < 90 ? rad2dgr(d3.mean([d.startAngle, d.endAngle])) - 90  : rad2dgr(d3.mean([d.startAngle, d.endAngle])) + 90})`)
      .attr('alignment-baseline', 'middle')
      .attr('text-anchor', (rad2dgr(d3.mean([d.startAngle, d.endAngle])) - 90 < 90 ? 'end': 'start'))
      .text(species)
      .on('click', () => updateHist(species)); //function(m) {return updateHist(this.parentNode, species)});

    // paint heatmap tiles for species
    group.categories.map(cat => {
      window.setTimeout(
        () => {
          piece.append('path')
             .attr('fill', d3.interpolateViridis(cat[tileset][species]))
             .attr('d', cat.ring(d))
             .attr('class', 'heatmap_tile')
             .on('click', () => updateHist(species)) //function(m) {return updateHist(this.parentNode, species)})
             .append('title')
             .text(`${cat.name} (${cat.sample_size} Samples)`);
        },
        idx * 5
      );
    });
  });
}

// ##### create initial graph ####
create_heatmap(GROUP, TILESET);
updateHist(SPECIES[0]);
