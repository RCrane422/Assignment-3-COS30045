// === Shared Setup ===
const width = 800;
const height = 500;
const margin = {top: 40, right: 40, bottom: 70, left: 70};

// === SVG Container Setup ===
const svg = d3.select("#scatterplot1")
  .append("svg")
  .attr("viewBox", `0 0 ${width} ${height}`)
  .attr("preserveAspectRatio", "xMidYMid meet")
  .classed("responsive-svg", true);

// === Axis Groups ===
const xAxisGroup = svg.append("g")
  .attr("transform", `translate(0, ${height - margin.bottom})`);

const yAxisGroup = svg.append("g")
  .attr("transform", `translate(${margin.left}, 0)`);

// === Data Points and Average Line Groups ===
const pointsGroup = svg.append("g");
const avgLineGroup = svg.append("g");

// === Tooltip Setup ===
const tooltip = d3.select("#tooltip")
  .attr("class", "tooltip")
  .style("position", "absolute")
  .style("opacity", 0);

// === Axis Labels ===
// X-axis label
svg.append("text")
  .attr("class", "x-label")
  .attr("x", width / 2)
  .attr("y", height - 20)
  .attr("text-anchor", "middle")
  .attr("font-weight", "bold")
  .text("Alcohol Consumption (Litres)");

// Y-axis label
svg.append("text")
  .attr("class", "y-label")
  .attr("transform", `rotate(-90)`)
  .attr("x", -height / 2)
  .attr("y", 20)
  .attr("text-anchor", "middle")
  .attr("font-weight", "bold")
  .text("Perceived Health %");

// === Prepare Year Selector ===
const years = [];
for (let y = 2015; y <= 2022; y++) years.push(y.toString());

const yearSelect = d3.select("#controls")
  .append("select")
  .attr("id", "year-select");

yearSelect.selectAll("option")
  .data(years)
  .join("option")
  .attr("value", d => d)
  .text(d => d);

yearSelect.property("value", "2022"); // Default selected year

// === Load Data from CSV Files ===
let alcoholData, healthData;

Promise.all([
  d3.csv("CSV/Alcohol_Consumption.csv"),
  d3.csv("CSV/Health_Status.csv")
]).then(([alcData, hlthData]) => {
  // Parse and clean data
  alcData.forEach(d => {
    d.OBS_VALUE = +d.OBS_VALUE;
    d.TIME_PERIOD = d.TIME_PERIOD.trim();
  });
  hlthData.forEach(d => {
    d.OBS_VALUE = +d.OBS_VALUE;
    d.TIME_PERIOD = d.TIME_PERIOD.trim();
  });

  // Filter for valid years only
  alcoholData = alcData.filter(d => years.includes(d.TIME_PERIOD));
  healthData = hlthData.filter(d => years.includes(d.TIME_PERIOD));

  // Initial plot with default year
  updatePlot("2022");

  // Update plot when dropdown selection changes
  yearSelect.on("change", function () {
    updatePlot(this.value);
  });
});

// === Update Plot Function ===
function updatePlot(selectedYear) {
  // Filter data by selected year
  const alcFiltered = alcoholData.filter(d => d.TIME_PERIOD === selectedYear);
  const healthFiltered = healthData.filter(d => d.TIME_PERIOD === selectedYear);

  // Group data by country and calculate average alcohol consumption
  const alcByCountry = d3.group(alcFiltered, d => d["Reference area"]);
  const avgAlc = new Map();
  alcByCountry.forEach((vals, country) => {
    avgAlc.set(country, d3.mean(vals, d => d.OBS_VALUE));
  });

  // Group data by country and calculate average perceived health
  const healthByCountry = d3.group(healthFiltered, d => d["Reference area"]);
  const avgHealth = new Map();
  healthByCountry.forEach((vals, country) => {
    avgHealth.set(country, d3.mean(vals, d => d.OBS_VALUE));
  });

  // Combine alcohol and health averages for countries with both data
  const combinedData = [];
  avgAlc.forEach((alcVal, country) => {
    if (avgHealth.has(country)) {
      combinedData.push({
        country,
        alcohol: alcVal,
        health: avgHealth.get(country)
      });
    }
  });

  // === Scales Setup ===
  const xMax = d3.max(combinedData, d => d.alcohol) || 1;
  const yMax = d3.max(combinedData, d => d.health) || 100;

  const xScale = d3.scaleLinear()
    .domain([0, xMax * 1.1])
    .range([margin.left, width - margin.right]);

  const yScale = d3.scaleLinear()
    .domain([0, yMax * 1.1])
    .range([height - margin.bottom, margin.top]);

  // === Axes Setup ===
  const xAxis = d3.axisBottom(xScale).ticks(10);
  const yAxis = d3.axisLeft(yScale).ticks(10);

  xAxisGroup.transition().duration(750).call(xAxis);
  yAxisGroup.transition().duration(750).call(yAxis);

  // === Data Points Binding and Transition ===
  const circles = pointsGroup.selectAll("circle")
    .data(combinedData, d => d.country);

  circles.exit()
    .transition().duration(500)
    .attr("r", 0)
    .remove();

  circles.transition()
    .duration(750)
    .attr("cx", d => xScale(d.alcohol))
    .attr("cy", d => yScale(d.health))
    .attr("r", 6)
    .attr("fill", "blue")
    .attr("opacity", 0.8);

  circles.enter()
    .append("circle")
    .attr("cx", d => xScale(d.alcohol))
    .attr("cy", d => yScale(d.health))
    .attr("r", 0)
    .attr("fill", "blue")
    .attr("opacity", 0.8)
    .on("click", (event, d) => {
      tooltip.transition()
        .duration(200)
        .style("opacity", 0.9);
      tooltip.html(`<strong>${d.country}</strong><br/>Alcohol: ${d.alcohol.toFixed(2)} L<br/>Health: ${d.health.toFixed(1)}%`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .transition()
    .duration(750)
    .attr("r", 6);

  // Re-bind tooltip for all circles (including existing ones)
  pointsGroup.selectAll("circle")
    .on("click", (event, d) => {
      tooltip.transition()
        .duration(200)
        .style("opacity", 0.9);
      tooltip.html(`<strong>${d.country}</strong><br/>Alcohol: ${d.alcohol.toFixed(2)} L<br/>Health: ${d.health.toFixed(1)}%`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    });

  // === Draw Average Health Line ===
  const avgHealthValue = d3.mean(combinedData, d => d.health);

  const lineData = [
    {x: 0, y: avgHealthValue},
    {x: xMax * 1.1, y: avgHealthValue}
  ];

  const lineGenerator = d3.line()
    .x(d => xScale(d.x))
    .y(d => yScale(d.y));

  const avgLine = avgLineGroup.selectAll("path").data([lineData]);

  avgLine.exit().remove();

  avgLine.transition()
    .duration(750)
    .attr("d", lineGenerator)
    .attr("stroke", "red")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "5 5")
    .attr("fill", "none");

  avgLine.enter()
    .append("path")
    .attr("d", lineGenerator)
    .attr("stroke", "red")
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "5 5")
    .attr("fill", "none");
}

// === Tooltip Hide on Background Click ===
svg.on("click", (event) => {
  if (!event.target.closest("circle")) {
    tooltip.transition().duration(200).style("opacity", 0);
  }
});

// Navigation toggle
const navToggle = document.getElementById('navToggle');
const nav = document.querySelector('aside nav');

navToggle.addEventListener('click', () => {
  nav.classList.toggle('open');
});
