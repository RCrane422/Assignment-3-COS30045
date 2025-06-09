// Shared Setup
const width = 800, height = 500;
const margin = { top: 40, right: 40, bottom: 70, left: 70 };

// Tooltip
const tooltip = d3.select("#tooltip")
  .attr("class", "tooltip")
  .style("position", "absolute")
  .style("opacity", 0);

// Year Selector
const years = d3.range(2015, 2023 + 1).map(String);
const yearSelect = d3.select("#controls").append("select").attr("id", "year-select");

yearSelect.selectAll("option")
  .data(years)
  .join("option")
  .attr("value", d => d)
  .text(d => d);
yearSelect.property("value", "2022");

// Helper: Create SVG & Setup Axes
function createScatterplot(containerId, xLabel, yLabel) {
  const svg = d3.select(containerId)
    .append("svg")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .classed("responsive-svg", true)
    .style("width", "100%")
    .style("height", "auto")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  svg.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`);
  svg.append("g").attr("class", "y-axis");

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 50)
    .attr("text-anchor", "middle")
    .attr("font-weight", "bold")
    .text(xLabel);

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -50)
    .attr("text-anchor", "middle")
    .attr("font-weight", "bold")
    .text(yLabel);

  return {
    svg,
    pointsGroup: svg.append("g"),
    avgLineGroup: svg.append("g")
  };
}

// Create two plots
const plot1 = createScatterplot("#scatterplot1", "Alcohol Consumption (Litres)", "Perceived Health, Good/Very Good %");
const plot2 = createScatterplot("#scatterplot2", "Alcohol Consumption (Litres)", "Perceived Health, Poor/Very Poor %");

// Data Load
let alcoholData, goodHealthData, poorHealthData;

Promise.all([
  d3.csv("CSV/Alcohol_Consumption.csv"),
  d3.csv("CSV/Health_Status.csv"),
  d3.csv("CSV/Poor_Health_Status.csv")
]).then(([alc, good, poor]) => {
  // Convert values to numbers & trim year
  [alc, good, poor].forEach(dataset =>
    dataset.forEach(d => {
      d.OBS_VALUE = +d.OBS_VALUE;
      d.TIME_PERIOD = d.TIME_PERIOD.trim();
    })
  );

  alcoholData = alc.filter(d => years.includes(d.TIME_PERIOD));
  goodHealthData = good.filter(d => years.includes(d.TIME_PERIOD));
  poorHealthData = poor.filter(d => years.includes(d.TIME_PERIOD));

  updatePlot("2022");
  yearSelect.on("change", function () {
    updatePlot(this.value);
  });
}).catch(err => console.error("Data load error:", err));

// Plot Update Function
function updatePlot(year) {
  const filterByYear = (data) => data.filter(d => d.TIME_PERIOD === year);
  const avgByCountry = (data) => d3.rollup(data, v => d3.mean(v, d => d.OBS_VALUE), d => d["Reference area"]);

  const alc = avgByCountry(filterByYear(alcoholData));
  const good = avgByCountry(filterByYear(goodHealthData));
  const poor = avgByCountry(filterByYear(poorHealthData));

  const mergeData = (map1, map2) => {
    const result = [];
    map1.forEach((val, key) => {
      if (map2.has(key)) {
        result.push({ country: key, alcohol: val, health: map2.get(key) });
      }
    });
    return result;
  };

  drawScatterplot(plot1, mergeData(alc, good), "blue", "red", true);
  drawScatterplot(plot2, mergeData(alc, poor), "purple", "orange", false);
}

// Draw Scatterplot 
function drawScatterplot(plot, data, pointColor, lineColor, isGoodHealth) {
  const { svg, pointsGroup, avgLineGroup } = plot;

  const xMax = d3.max(data, d => d.alcohol) || 1;
  const yMax = d3.max(data, d => d.health) || 100;

  const xScale = d3.scaleLinear().domain([0, xMax * 1.1]).range([0, width]);
  const yScale = d3.scaleLinear().domain([0, Math.min(yMax * 1.1, 100)]).range([height, 0]);

  const xAxis = d3.axisBottom(xScale).ticks(10);
  const yAxis = d3.axisLeft(yScale).ticks(10).tickFormat(d => d + "%");

  svg.select(".x-axis").transition().duration(750).call(xAxis);
  svg.select(".y-axis").transition().duration(750).call(yAxis);

  const circles = pointsGroup.selectAll("circle").data(data, d => d.country);

  circles.exit().transition().duration(500).attr("r", 0).remove();

  circles.transition().duration(750)
    .attr("cx", d => xScale(d.alcohol))
    .attr("cy", d => yScale(d.health))
    .attr("r", 6)
    .attr("fill", pointColor)
    .attr("opacity", 0.8);

  circles.enter().append("circle")
    .attr("cx", d => xScale(d.alcohol))
    .attr("cy", d => yScale(d.health))
    .attr("r", 0)
    .attr("fill", pointColor)
    .attr("opacity", 0.8)
    .on("click", (event, d) => {
      tooltip.transition().duration(200).style("opacity", 0.9);
      tooltip.html(`
        <strong>${d.country}</strong><br/>
        Alcohol: ${d.alcohol.toFixed(2)} L<br/>
        ${isGoodHealth ? "Good/Very Good" : "Poor/Very Poor"} Health: ${d.health.toFixed(1)}%
      `)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .transition().duration(750).attr("r", 6);

  // Average line
  const avgY = d3.mean(data, d => d.health);
  const lineData = [{ x: 0, y: avgY }, { x: xMax * 1.1, y: avgY }];
  const line = d3.line().x(d => xScale(d.x)).y(d => yScale(d.y));

  const path = avgLineGroup.selectAll("path").data([lineData]);

  path.enter().append("path")
    .merge(path)
    .attr("d", line)
    .attr("stroke", lineColor)
    .attr("stroke-width", 2)
    .attr("stroke-dasharray", "5 5")
    .attr("fill", "none");

  path.exit().remove();
}

// Hide Tooltip on Background Click
[plot1.svg, plot2.svg].forEach(svgEl =>
  svgEl.on("click", (event) => {
    if (!event.target.closest("circle")) {
      tooltip.transition().duration(200).style("opacity", 0);
    }
  })
);

// Nav Toggle
document.getElementById('navToggle').addEventListener('click', () => {
  document.querySelector('aside nav').classList.toggle('open');
});
