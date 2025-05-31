// === Shared Setup ===
const margin = { top: 40, right: 40, bottom: 70, left: 70 };
const width = 800 - margin.left - margin.right;
const heightMain = 450 - margin.top - margin.bottom;
const heightAvg = 450 - margin.top - margin.bottom;

// === Main Line Chart SVG Container ===
const svg = d3.select("#linechart")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", heightMain + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// === Load & Process Country-Level Data ===
Promise.all([
  d3.csv("CSV/Tobacco_Consumption2.csv"),
  d3.csv("CSV/Vaping_Consumption2.csv")
]).then(([tobaccoDataRaw, vapingDataRaw]) => {

  const parse = data =>
    data.filter(d => d["OBS_VALUE"] && !isNaN(d["OBS_VALUE"]))
      .map(d => ({
        country: d["Reference area"],
        year: +d["TIME_PERIOD"],
        value: +d["OBS_VALUE"]
      }));

  const tobaccoData = parse(tobaccoDataRaw);
  const vapingData = parse(vapingDataRaw);

  const commonCountries = [...new Set(tobaccoData.map(d => d.country))]
    .filter(c => vapingData.some(v => v.country === c))
    .sort();

  // Populate Dropdown
  const countrySelect = d3.select("#country-select");
  countrySelect.selectAll("option")
    .data(commonCountries)
    .enter()
    .append("option")
    .text(d => d)
    .attr("value", d => d);

  // Scales & Axes
  const xScale = d3.scaleLinear().range([0, width]);
  const yScale = d3.scaleLinear().range([heightMain, 0]);
  const xAxis = d3.axisBottom(xScale).tickFormat(d3.format("d"));
  const yAxis = d3.axisLeft(yScale);

  svg.append("g").attr("class", "x-axis").attr("transform", `translate(0,${heightMain})`);
  svg.append("g").attr("class", "y-axis");

  // Axis Labels
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", heightMain + 50)
    .attr("text-anchor", "middle")
    .text("Year");

  svg.append("text")
    .attr("x", -heightMain / 2)
    .attr("y", -50)
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Percentage of Population (%)");

  // Line Generators
  const line = d3.line()
    .x(d => xScale(d.year))
    .y(d => yScale(d.value));

  // Chart Update Function
  function updateChart(country) {
    const tobacco = tobaccoData.filter(d => d.country === country).sort((a, b) => a.year - b.year);
    const vaping = vapingData.filter(d => d.country === country).sort((a, b) => a.year - b.year);

    const years = [...new Set([...tobacco.map(d => d.year), ...vaping.map(d => d.year)])];
    const values = [...tobacco.map(d => d.value), ...vaping.map(d => d.value)];

    xScale.domain(d3.extent(years)).nice();
    yScale.domain([0, d3.max(values) * 1.1]).nice();

    svg.select(".x-axis").call(xAxis);
    svg.select(".y-axis").call(yAxis);

    // Remove old elements
    svg.selectAll(".tobacco-line, .vaping-line, .tobacco-marker, .vaping-marker, .legend").remove();

    // Draw lines
    svg.append("path")
      .datum(tobacco)
      .attr("class", "tobacco-line")
      .attr("fill", "none")
      .attr("stroke", "blue")
      .attr("stroke-width", 2)
      .attr("d", line);

    svg.append("path")
      .datum(vaping)
      .attr("class", "vaping-line")
      .attr("fill", "none")
      .attr("stroke", "green")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Draw markers
    svg.selectAll(".tobacco-marker")
      .data(tobacco)
      .enter()
      .append("circle")
      .attr("class", "tobacco-marker")
      .attr("cx", d => xScale(d.year))
      .attr("cy", d => yScale(d.value))
      .attr("r", 4)
      .attr("fill", "blue");

    svg.selectAll(".vaping-marker")
      .data(vaping)
      .enter()
      .append("circle")
      .attr("class", "vaping-marker")
      .attr("cx", d => xScale(d.year))
      .attr("cy", d => yScale(d.value))
      .attr("r", 4)
      .attr("fill", "green");

    // Add legend
    const legend = svg.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${width - 120}, 20)`);

    legend.append("rect")
      .attr("width", 100)
      .attr("height", 50)
      .attr("fill", "white")
      .attr("stroke", "black");

    legend.append("line")
      .attr("x1", 10).attr("y1", 15)
      .attr("x2", 30).attr("y2", 15)
      .attr("stroke", "blue")
      .attr("stroke-width", 2);
    legend.append("text").attr("x", 35).attr("y", 20).text("Tobacco");

    legend.append("line")
      .attr("x1", 10).attr("y1", 35)
      .attr("x2", 30).attr("y2", 35)
      .attr("stroke", "green")
      .attr("stroke-width", 2);
    legend.append("text").attr("x", 35).attr("y", 40).text("Vaping");
  }

  updateChart(commonCountries[0]);
  countrySelect.on("change", function () {
    updateChart(this.value);
  });

}).catch(error => {
  console.error("Error loading country-level CSVs:", error);
});

// === Average Chart Setup ===
const svgAvg = d3.select("#averagechart")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", heightAvg + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

Promise.all([
  d3.csv("CSV/Tobacco_Average.csv"),
  d3.csv("CSV/Vaping_Average.csv")
]).then(([tobaccoAvgRaw, vapingAvgRaw]) => {

  // Parse average data, using correct column name
  const parseAvg = data => data
    .filter(d => d["Row Labels"] !== "Grand Total" && !isNaN(d["Average of OBS_VALUE"]))
    .map(d => ({
      year: +d["Row Labels"],
      value: +d["Average of OBS_VALUE"]
    }));

  const tobaccoAvg = parseAvg(tobaccoAvgRaw);
  const vapingAvg = parseAvg(vapingAvgRaw);

  // Combine years and values for scaling
  const years = [...new Set([...tobaccoAvg.map(d => d.year), ...vapingAvg.map(d => d.year)])];
  const values = [...tobaccoAvg.map(d => d.value), ...vapingAvg.map(d => d.value)];

  // Scales
  const xScaleAvg = d3.scaleLinear()
    .range([0, width])
    .domain(d3.extent(years))
    .nice();

  const yScaleAvg = d3.scaleLinear()
    .range([heightAvg, 0])
    .domain([0, d3.max(values) * 1.1])
    .nice();

  // Axes
  const xAxisAvg = d3.axisBottom(xScaleAvg).tickFormat(d3.format("d"));
  const yAxisAvg = d3.axisLeft(yScaleAvg);

  svgAvg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0,${heightAvg})`)
    .call(xAxisAvg);

  svgAvg.append("g")
    .attr("class", "y-axis")
    .call(yAxisAvg);

  // Axis Labels
  svgAvg.append("text")
    .attr("x", width / 2)
    .attr("y", heightAvg + 50)
    .attr("text-anchor", "middle")
    .text("Year");

  svgAvg.append("text")
    .attr("x", -heightAvg / 2)
    .attr("y", -50)
    .attr("text-anchor", "middle")
    .attr("transform", "rotate(-90)")
    .text("Average % of Population");

  // Line Generator
  const lineAvg = d3.line()
    .x(d => xScaleAvg(d.year))
    .y(d => yScaleAvg(d.value))
    .defined(d => !isNaN(d.value)); // Skip invalid values

  // Draw Lines
  svgAvg.append("path")
    .datum(tobaccoAvg)
    .attr("class", "tobacco-line")
    .attr("fill", "none")
    .attr("stroke", "blue")
    .attr("stroke-width", 2)
    .attr("d", lineAvg);

  svgAvg.append("path")
    .datum(vapingAvg)
    .attr("class", "vaping-line")
    .attr("fill", "none")
    .attr("stroke", "green")
    .attr("stroke-width", 2)
    .attr("d", lineAvg);

  // Draw Markers
  svgAvg.selectAll(".tobacco-marker")
    .data(tobaccoAvg)
    .enter()
    .append("circle")
    .attr("class", "tobacco-marker")
    .attr("cx", d => xScaleAvg(d.year))
    .attr("cy", d => yScaleAvg(d.value))
    .attr("r", 4)
    .attr("fill", "blue");

  svgAvg.selectAll(".vaping-marker")
    .data(vapingAvg)
    .enter()
    .append("circle")
    .attr("class", "vaping-marker")
    .attr("cx", d => xScaleAvg(d.year))
    .attr("cy", d => yScaleAvg(d.value))
    .attr("r", 4)
    .attr("fill", "green");

  // Add Legend
  const legend = svgAvg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${width - 120}, 20)`);

  legend.append("rect")
    .attr("width", 100)
    .attr("height", 50)
    .attr("fill", "white")
    .attr("stroke", "black");

  legend.append("line")
    .attr("x1", 10).attr("y1", 15)
    .attr("x2", 30).attr("y2", 15)
    .attr("stroke", "blue")
    .attr("stroke-width", 2);
  legend.append("text")
    .attr("x", 35)
    .attr("y", 20)
    .text("Tobacco");

  legend.append("line")
    .attr("x1", 10).attr("y1", 35)
    .attr("x2", 30).attr("y2", 35)
    .attr("stroke", "green")
    .attr("stroke-width", 2);
  legend.append("text")
    .attr("x", 35)
    .attr("y", 40)
    .text("Vaping");

}).catch(error => {
  console.error("Error loading average CSV files:", error);
});