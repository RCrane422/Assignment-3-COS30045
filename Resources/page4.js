// Dimensions for map SVG
const mapWidth = 1160;
const mapHeight = 700;

// Create SVG container
const svg = d3.select("#map")
  .append("svg")
     .attr("viewBox", `0 0 ${mapWidth} ${mapHeight}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%")
    .style("height", "auto");

// Projection and path generator
const projection = d3.geoNaturalEarth1()
  .scale(160)
  .translate([(mapWidth / 2) - 100, mapHeight / 2]);
const geoPath = d3.geoPath().projection(projection);

// Tooltip div 
const tooltip = d3.select("#map")
  .append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("background", "white")
    .style("padding", "6px 10px")
    .style("border", "1px solid #aaa")
    .style("border-radius", "4px")
    .style("pointer-events", "none")
    .style("opacity", 0);

// Color scales for smoking vs. vaping
const smokingScale = d3.scaleSequential([0, 35], d3.interpolateReds);
const vapingScale = d3.scaleSequential([0, 6], d3.interpolateReds);



let worldData, healthData;

// Load map geometry and health CSV
Promise.all([
  d3.json("Resources/countries.json"),
  d3.csv("CSV/Health_Risk3.csv")
]).then(([geoJson, csv]) => {
  worldData = geoJson;
  healthData = csv;
  drawMap("SP_DS");

  // Enable pan/zoom
  svg.call(d3.zoom()
    .scaleExtent([1, 8])
    .on("zoom", (event) => {
      svg.selectAll("path").attr("transform", event.transform);
    })
  );
}).catch(err => console.error("Error loading data:", err));



// Draw or update map by chosen measure
function drawMap(measure) {
  const isSmoking = measure === "SP_DS";
  const scale = isSmoking ? smokingScale : vapingScale;
  const label = isSmoking ? "Smoking" : "Vaping";
  const maxValue = isSmoking ? 35 : 6;

  // Pick latest value per country
  const latest = new Map();
  healthData
    .filter(d => d.MEASURE === measure && d.OBS_VALUE)
    .forEach(d => {
      const code = d.REF_AREA;
      const year = +d.TIME_PERIOD;
      const val = +d.OBS_VALUE;
      const prev = latest.get(code);
      if (!prev || prev.year < year) {
        latest.set(code, { value: val, year });
      }
    });

  // Bind countries to paths
  const paths = svg.selectAll("path")
    .data(worldData.features, d => d.properties.iso_a3 || d.id);

  // Enter + update
  paths.enter()
    .append("path")
    .merge(paths)
      .attr("d", geoPath)
      .attr("fill", d => {
        const rec = latest.get(d.properties.iso_a3 || d.id);
        return rec ? scale(rec.value) : "#ccc";
      })
      .attr("stroke", "#eee")
      .on("mouseover", function(event, d) {
        const rec = latest.get(d.properties.iso_a3 || d.id);
        d3.select(this).attr("fill", "#99c2b1");
        tooltip.transition().duration(200).style("opacity", 0.9);
        tooltip.html(
          `<strong>${d.properties.name}</strong><br>${label}: ${rec ? rec.value + "%" : "No data"}`
        );
      })
      .on("mousemove", event => {
        tooltip
          .style("left", (event.pageX + 12) + "px")
          .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", function(event, d) {
        const rec = latest.get(d.properties.iso_a3 || d.id);
        d3.select(this).attr("fill", rec ? scale(rec.value) : "#ccc");
        tooltip.transition().duration(300).style("opacity", 0);
      });

  // Remove old paths
  paths.exit().remove();


  // Create Legend 
svg.selectAll(".legend").remove();

const legendWidth = 200;
const legendHeight = 10;
const legendMarginTop = 30;

const legend = svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(700, ${legendMarginTop})`);

const defs = svg.append("defs");

// Create Gradient Legend Rectangle

const gradientId = "color-gradient";
defs.selectAll(`#${gradientId}`).remove();
const gradient=defs.append("linearGradient")
    .attr("id", gradientId)
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "100%")
    .attr("y2", "0%");

gradient.selectAll("stop")
    .data(d3.range(0, 1.01, 0.01))    
    .enter()
    .append("stop")
    .attr("offset", d => `${d * 100}%`)
    .attr("stop-color", d => scale(d * maxValue));

legend.append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("fill", `url(#${gradientId})`)
    .attr("stroke", "#444");

    const legendScale = d3.scaleLinear()
      .domain([0, maxValue])
      .range([0, legendWidth]);

      const legendAxis = d3.axisBottom(legendScale)
      .ticks(5)
      .tickFormat(d => `${d}%`);

      legend.append("g")
  .attr("transform", `translate(0, ${legendHeight})`)
  .call(legendAxis)
  .select(".domain").remove(); 

// Legend Text

legend.append("text")
  .attr("x", 0)
  .attr("y", -10)
  .text(`${label} Prevalence`)
  .style("font-weight", "bold");

    }

d3.select("#riskSelector").on("change", function() {
  drawMap(this.value);
});

// Navigation Toggle 
const navToggle = document.getElementById('navToggle');
const nav = document.querySelector('aside nav');

navToggle.addEventListener('click', () => {
  nav.classList.toggle('open');
});