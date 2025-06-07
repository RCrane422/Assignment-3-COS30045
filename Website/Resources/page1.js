// Set dimensions and margins
const width = 800;
const height = 500;
const margin = { top: 40, right: 40, bottom: 70, left: 70 };

// Tooltip setup
const tooltip = d3.select("#tooltip")
  .attr("class", "tooltip")
  .style("position", "absolute")
  .style("opacity", 0);

// Build year selector
const years = d3.range(2015, 2024).map(String);
const yearSelect = d3.select("#controls").append("select").attr("id", "year-select");
yearSelect.selectAll("option")
  .data(years)
  .join("option")
    .attr("value", d => d)
    .text(d => d);
yearSelect.property("value", "2022");

// Function to create a scatterplot container
function createPlot(container, xLabel, yLabel) {
  const svg = d3.select(container)
    .append("svg")
      .attr("viewBox", `0 0 ${width+margin.left+margin.right} ${height+margin.top+margin.bottom}`)
      .classed("responsive-svg", true)
    .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

  svg.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`);
  svg.append("g").attr("class", "y-axis");

  // Axis labels
  svg.append("text")
      .attr("x", width/2)
      .attr("y", height + 50)
      .attr("text-anchor", "middle")
      .text(xLabel);

  svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height/2)
      .attr("y", -50)
      .attr("text-anchor", "middle")
      .text(yLabel);

  return {
    svg,
    points: svg.append("g"),
    avgLine: svg.append("g")
  };
}

// Create two plots
const plot1 = createPlot("#scatterplot1",
  "Alcohol Consumption (L)", "Good/Very Good Health (%)");
const plot2 = createPlot("#scatterplot2",
  "Alcohol Consumption (L)", "Poor/Very Poor Health (%)");

// Load and process data
let alcData, goodData, poorData;
Promise.all([
  d3.csv("CSV/Alcohol_Consumption.csv"),
  d3.csv("CSV/Health_Status.csv"),
  d3.csv("CSV/Poor_Health_Status.csv")
]).then(datasets => {
  datasets.forEach(ds => ds.forEach(d => {
    d.OBS_VALUE = +d.OBS_VALUE;
    d.TIME_PERIOD = d.TIME_PERIOD.trim();
  }));

  alcData  = datasets[0].filter(d => years.includes(d.TIME_PERIOD));
  goodData = datasets[1].filter(d => years.includes(d.TIME_PERIOD));
  poorData = datasets[2].filter(d => years.includes(d.TIME_PERIOD));

  updateChart("2022");
  yearSelect.on("change", () => updateChart(yearSelect.property("value")));
}).catch(console.error);

// Update both scatterplots for a given year
function updateChart(year) {
  function avgByCountry(data) {
    return d3.rollup(data, v => d3.mean(v, d => d.OBS_VALUE), d => d["Reference area"]);
  }

  const alcAvg  = avgByCountry(alcData.filter(d => d.TIME_PERIOD === year));
  const goodAvg = avgByCountry(goodData.filter(d => d.TIME_PERIOD === year));
  const poorAvg = avgByCountry(poorData.filter(d => d.TIME_PERIOD === year));

  // Merge two maps into an array
  function merge(alcMap, healthMap) {
    const arr = [];
    alcMap.forEach((val, country) => {
      if (healthMap.has(country)) {
        arr.push({ country, alcohol: val, health: healthMap.get(country) });
      }
    });
    return arr;
  }

  draw(plot1, merge(alcAvg, goodAvg), "steelblue", "red");
  draw(plot2, merge(alcAvg, poorAvg), "purple", "orange");
}

// Draw or update one scatterplot
function draw(plot, data, dotColor, lineColor) {
  const { svg, points, avgLine } = plot;

  // Scales
  const xMax = d3.max(data, d => d.alcohol) || 1;
  const yMax = d3.max(data, d => d.health) || 100;
  const xScale = d3.scaleLinear([0, xMax*1.1], [0, width]);
  const yScale = d3.scaleLinear([0, Math.min(yMax*1.1,100)], [height,0]);

  // Update axes
  svg.select(".x-axis").transition().call(d3.axisBottom(xScale).ticks(10));
  svg.select(".y-axis").transition().call(d3.axisLeft(yScale).ticks(10).tickFormat(d => d + "%"));

  // Bind data to circles
  const circles = points.selectAll("circle").data(data, d => d.country);

  circles.exit().transition().attr("r", 0).remove();
  circles.transition()
    .attr("cx", d => xScale(d.alcohol))
    .attr("cy", d => yScale(d.health))
    .attr("r", 6)
    .attr("fill", dotColor)
    .attr("opacity", 0.8);

  circles.enter().append("circle")
    .attr("cx", d => xScale(d.alcohol))
    .attr("cy", d => yScale(d.health))
    .attr("r", 0)
    .attr("fill", dotColor)
    .attr("opacity", 0.8)
    .on("click", (e, d) => {
      tooltip.style("opacity", 1)
        .html(`<strong>${d.country}</strong><br>Alcohol: ${d.alcohol.toFixed(2)} L<br>Health: ${d.health.toFixed(1)}%`)
        .style("left", `${e.pageX+10}px`)
        .style("top",  `${e.pageY-28}px`);
    })
    .transition().attr("r", 6);

  const avgY = d3.mean(data, d => d.health);
  const lineGen = d3.line()
    .x(d => xScale(d.x))
    .y(d => yScale(d.y));
  const lineData = [{ x: 0, y: avgY }, { x: xMax*1.1, y: avgY }];

  const path = avgLine.selectAll("path").data([lineData]);
  path.enter().append("path")
    .merge(path)
    .attr("d", lineGen)
    .attr("stroke", lineColor)
    .attr("stroke-dasharray", "5 5")
    .attr("fill", "none");
  path.exit().remove();
}

[plot1.svg, plot2.svg].forEach(s => s.on("click", e => {
  if (!e.target.closest("circle")) tooltip.style("opacity", 0);
}));

//  Navigation Toggle 
const navToggle = document.getElementById('navToggle');
const nav = document.querySelector('aside nav');

navToggle.addEventListener('click', () => {
  nav.classList.toggle('open');
});