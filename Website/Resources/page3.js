// Chart dimensions and margins
const width  = 850;
const height = 500;
const margin = { top: 40, right: 100, bottom: 70, left: 70 };

// Create SVG and main chart group
const svg = d3.select("#chart4")
  .append("svg")
    .attr("width",  width + margin.left + margin.right)
    .attr("height", height)
  .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

const innerWidth  = width  - margin.left - margin.right;
const innerHeight = height - margin.top  - margin.bottom;

// Load both datasets
Promise.all([
  d3.csv("CSV/Obesity_Data.csv"),
  d3.csv("CSV/Alcohol_Consumption4.csv")
]).then(([obesityRaw, alcoholRaw]) => {

  const parse = (d) => ({
    year:    +d.TIME_PERIOD,
    country: d["Reference area"],
    value:   +d.OBS_VALUE
  });

  const obesity  = obesityRaw.map(parse);
  const alcohol  = alcoholRaw.map(parse);

  // Build country dropdown
  const countries = Array.from(new Set(obesity.map(d => d.country))).sort();
  const dropdown  = d3.select("#country-select")
    .selectAll("option")
    .data(countries)
    .join("option")
      .attr("value", d => d)
      .text(d => d)
      .property("selected", d => d === "Finland");

  // Draw initial chart
  drawChart("Finland");

  dropdown.on("change", () => drawChart(dropdown.node().value));

  // Main drawing function
  function drawChart(country) {
    
    const obs = obesity.filter(d => d.country === country).sort((a,b) => a.year - b.year);
    const alc = alcohol.filter(d => d.country === country).sort((a,b) => a.year - b.year);

    svg.selectAll("*").remove();  

    // Scales
    const years   = [...new Set([...obs, ...alc].map(d => d.year))];
    const xScale  = d3.scaleLinear().domain(d3.extent(years)).range([0, innerWidth]);
    const yLeft   = d3.scaleLinear().domain([0, d3.max(obs, d => d.value)*1.1]).range([innerHeight, 0]);
    const yRight  = d3.scaleLinear().domain([0, d3.max(alc, d => d.value)*1.1]).range([innerHeight, 0]);

    // X axis
    svg.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.format("d")));

    // Left Y axis (obesity)
    svg.append("g").call(d3.axisLeft(yLeft));
    svg.append("text")  
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight/2)
      .attr("y", -50)
      .attr("text-anchor", "middle")
      .text("Obesity Rate (%)");

    // Right Y axis (alcohol)
    svg.append("g")
      .attr("transform", `translate(${innerWidth},0)`)
      .call(d3.axisRight(yRight));
    svg.append("text")  
      .attr("transform", "rotate(-90)")
      .attr("x", -innerHeight/2)
      .attr("y", innerWidth + 50)
      .attr("text-anchor", "middle")
      .text("Alcohol Consumption (L)");

    // Plot obesity points
    svg.selectAll(".obs-dot")
      .data(obs)
      .enter()
      .append("circle")
        .attr("class", "obs-dot")
        .attr("cx", d => xScale(d.year))
        .attr("cy", d => yLeft(d.value))
        .attr("r", 6)
        .attr("fill", "blue")
        .attr("opacity", 0.8);

    // Plot alcohol line
    const alcLine = d3.line()
      .x(d => xScale(d.year))
      .y(d => yRight(d.value));

    svg.append("path")
      .datum(alc)
      .attr("fill", "none")
      .attr("stroke", "firebrick")
      .attr("stroke-dasharray", "5 5")
      .attr("stroke-width", 2)
      .attr("d", alcLine);

    // Legend box
    const legend = svg.append("g")
      .attr("transform", `translate(${innerWidth + 20}, 0)`);

    legend.append("rect")  
      .attr("width", 180)
      .attr("height", 60)
      .attr("fill", "white")
      .attr("stroke", "#444");

    // Legend entries
    [["Obesity Rate", "blue", 20], ["Alcohol Consumption", "firebrick", 40]].forEach(([label, col, y]) => {
      if (label === "Obesity Rate") {
        legend.append("circle")
          .attr("cx", 12).attr("cy", y).attr("r", 6).attr("fill", col);
      } else {
        legend.append("line")
          .attr("x1", 6).attr("y1", y)
          .attr("x2", 26).attr("y2", y)
          .attr("stroke", col)
          .attr("stroke-dasharray", "5 5")
          .attr("stroke-width", 2);
      }
      legend.append("text")
        .attr("x", 36)
        .attr("y", y + 4)
        .style("font-size", "12px")
        .text(label);
    });
  }

}).catch(err => console.error("Error loading data:", err));

//  Navigation Toggle 
const navToggle = document.getElementById('navToggle');
const nav = document.querySelector('aside nav');

navToggle.addEventListener('click', () => {
  nav.classList.toggle('open');
});
