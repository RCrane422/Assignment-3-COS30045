// SVG Box Setup
const width = 800;
const height = 500;
const margin = {top: 40, right: 40, bottom: 70, left: 70};

const svg = d3.select("#chart4")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

const chart = svg.append("g")
  .attr("transform", `translate(${margin.left}, ${margin.top})`);


const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

d3.csv("CSV/Obesity_Data.csv").then(data => {
  data.forEach(d => {
    d.obesity = +d.OBS_VALUE;
    d.year = +d.TIME_PERIOD;
    d.country = d.REF_AREA;
  });
  const filteredData = data.filter(d => d.country === "EST");
  const x = d3.scaleBand()
    .domain(filteredData.map(d => d.year))
    .range([0, innerWidth])
    .padding(0.2);
  const y = d3.scaleLinear()
    .domain([0, d3.max(filteredData, d => d.obesity) * 1.1])
    .range([innerHeight, 0])
    .nice();
  chart.append("g")
    .attr("transform", `translate(0, ${innerHeight})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")));
  chart.append("g")
    .call(d3.axisLeft(y))
    .append("text")
    .attr("fill", "#000")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -50)
    .attr("text-anchor", "middle")
    .text("Obesity Rate (%)");
  chart.selectAll(".bar")
    .data(filteredData)
    .enter()
    .append("rect")
    .attr("x", d => x(d.year))
    .attr("y", d => y(d.obesity))
    .attr("width", x.bandwidth())
    .attr("height", d => innerHeight - y(d.obesity))
    .attr("fill", "teal")
    .attr("opacity", 0.7);
});