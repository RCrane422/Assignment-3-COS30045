// Shared config for SVG 
const margin = { top: 40, right: 40, bottom: 70, left: 70 };
const width  = 800 - margin.left - margin.right;
const height = 450 - margin.top  - margin.bottom;

// SVG Creation inside a container
function setupSvg(selector) {
  return d3.select(selector)
    .append("svg")
      .attr("width",  width + margin.left + margin.right)
      .attr("height", height + margin.top  + margin.bottom)
      .classed("responsive-svg", true)
    .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
}

const svgMain = setupSvg("#linechart");
const svgAvg  = setupSvg("#averagechart");

// Add axes and labels to an SVG
function setupAxes(svg, yLabel) {
  svg.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height})`);

  svg.append("g")
      .attr("class", "y-axis");

  svg.append("text")
      .attr("class", "axis-label")
      .attr("x", width / 2)
      .attr("y", height + 50)
      .attr("text-anchor", "middle")
      .text("Year");

  svg.append("text")
      .attr("class", "axis-label")
      .attr("x", -height / 2)
      .attr("y", -50)
      .attr("transform", "rotate(-90)")
      .attr("text-anchor", "middle")
      .text(yLabel);
}

setupAxes(svgMain, "Population (%)");
setupAxes(svgAvg,  "Average Population (%)");

// Load all four CSVs in parallel
Promise.all([
  d3.csv("CSV/Tobacco_Consumption2.csv"),
  d3.csv("CSV/Vaping_Consumption2.csv"),
  d3.csv("CSV/Tobacco_Average.csv"),
  d3.csv("CSV/Vaping_Average.csv")
]).then(([tobaccoRaw, vapingRaw, tobaccoAvgRaw, vapingAvgRaw]) => {

  function parseData(data) {
    return data
      .filter(d => d.OBS_VALUE && !isNaN(d.OBS_VALUE))
      .map(d => ({
        country: d["Reference area"],
        year:    +d.TIME_PERIOD,
        value:   +d.OBS_VALUE
      }));
  }


  function parseAvg(data) {
    return data
      .filter(d => d["Row Labels"] !== "Grand Total" && !isNaN(d["Average of OBS_VALUE"]))
      .map(d => ({
        year:  +d["Row Labels"],
        value: +d["Average of OBS_VALUE"]
      }));
  }

  const tobaccoData = parseData(tobaccoRaw);
  const vapingData  = parseData(vapingRaw);
  const tobaccoAvg  = parseAvg(tobaccoAvgRaw);
  const vapingAvg   = parseAvg(vapingAvgRaw);

  // Build country dropdown
  const countries = Array.from(new Set(tobaccoData.map(d => d.country)))
    .filter(c => vapingData.some(v => v.country === c))
    .sort();

  d3.select("#country-select")
    .selectAll("option")
    .data(countries)
    .join("option")
      .attr("value", d => d)
      .text(d => d);

  // Scales and line generator 
  const xScale = d3.scaleLinear().range([0, width]);
  const yScale = d3.scaleLinear().range([height, 0]);
  const lineGen = d3.line()
    .x(d => xScale(d.year))
    .y(d => yScale(d.value));

  // Draw line plus markers
  function drawLine(svg, data, color, cls) {
    svg.append("path")
      .datum(data)
      .attr("class", `${cls}-line`)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", 2)
      .attr("d", lineGen);

    svg.selectAll(`.${cls}-marker`)
      .data(data)
      .enter()
      .append("circle")
        .attr("class", `${cls}-marker`)
        .attr("r", 4)
        .attr("cx", d => xScale(d.year))
        .attr("cy", d => yScale(d.value))
        .attr("fill", color);
  }

  // Update main chart by country
  function updateMainChart(country) {
    // Filter and sort
    const tob = tobaccoData.filter(d => d.country === country).sort((a,b) => a.year - b.year);
    const vap = vapingData.filter(d => d.country === country).sort((a,b) => a.year - b.year);

    const allYears  = [...new Set([...tob, ...vap].map(d => d.year))];
    const allValues = [...tob, ...vap].map(d => d.value);

    // Update scales
    xScale.domain(d3.extent(allYears)).nice();
    yScale.domain([0, d3.max(allValues) * 1.1]);

    // Redraw axes
    svgMain.select(".x-axis").call(d3.axisBottom(xScale).tickFormat(d3.format("d")));
    svgMain.select(".y-axis").call(d3.axisLeft(yScale));

    svgMain.selectAll(".tobacco-line, .vaping-line, .tobacco-marker, .vaping-marker, .legend").remove();

    drawLine(svgMain, tob, "steelblue",  "tobacco");
    drawLine(svgMain, vap, "darkgreen",  "vaping");

    // Legend box
    const legend = svgMain.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width - 120}, 20)`);

    legend.append("rect")
      .attr("width", 100)
      .attr("height", 50)
      .attr("fill", "white")
      .attr("stroke", "#444");

    [["Tobacco","steelblue",15], ["Vaping","darkgreen",35]].forEach(([label, color, y]) => {
      legend.append("line")
        .attr("x1", 10).attr("y1", y)
        .attr("x2", 30).attr("y2", y)
        .attr("stroke", color).attr("stroke-width", 2);
      legend.append("text")
        .attr("x", 35).attr("y", y + 5)
        .style("font-size", "12px")
        .text(label);
    });
  }

  // Draw average chart
  (() => {
    const xAvg = d3.scaleLinear()
      .domain(d3.extent([...tobaccoAvg, ...vapingAvg], d => d.year)).nice()
      .range([0, width]);

    const yAvg = d3.scaleLinear()
      .domain([0, d3.max([...tobaccoAvg, ...vapingAvg], d => d.value) * 1.1]).nice()
      .range([height, 0]);

    svgAvg.select(".x-axis").call(d3.axisBottom(xAvg).tickFormat(d3.format("d")));
    svgAvg.select(".y-axis").call(d3.axisLeft(yAvg));

    const avgLine = d3.line()
      .defined(d => !isNaN(d.value))
      .x(d => xAvg(d.year))
      .y(d => yAvg(d.value));

    [["tobacco","steelblue",tobaccoAvg], ["vaping","darkgreen",vapingAvg]]
      .forEach(([cls, color, data]) => {
        svgAvg.append("path")
          .datum(data)
          .attr("class", `${cls}-line`)
          .attr("fill", "none")
          .attr("stroke", color)
          .attr("stroke-width", 2)
          .attr("d", avgLine);

        svgAvg.selectAll(`.${cls}-marker`)
          .data(data)
          .enter()
          .append("circle")
            .attr("class", `${cls}-marker`)
            .attr("r", 4)
            .attr("cx", d => xAvg(d.year))
            .attr("cy", d => yAvg(d.value))
            .attr("fill", color);
      });

    // Average legend
    const legendAvg = svgAvg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width - 120}, 20)`);

    legendAvg.append("rect")
      .attr("width", 100)
      .attr("height", 50)
      .attr("fill", "white")
      .attr("stroke", "#444");

    [["Tobacco","steelblue",15], ["Vaping","darkgreen",35]].forEach(([label, color, y]) => {
      legendAvg.append("line")
        .attr("x1", 10).attr("y1", y)
        .attr("x2", 30).attr("y2", y)
        .attr("stroke", color).attr("stroke-width", 2);
      legendAvg.append("text")
        .attr("x", 35).attr("y", y + 5)
        .style("font-size", "12px")
        .text(label);
    });
  })();

  updateMainChart(countries[0]);
  d3.select("#country-select").on("change", function() {
    updateMainChart(this.value);
  });

}).catch(err => console.error("CSV loading error:", err));

//  Navigation Toggle 
const navToggle = document.getElementById('navToggle');
const nav = document.querySelector('aside nav');

navToggle.addEventListener('click', () => {
  nav.classList.toggle('open');
});