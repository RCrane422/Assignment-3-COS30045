const margin = {top: 40, right: 40, bottom: 70, left: 70};
const width = 600 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;

const svg = d3.select("#map")
  .append("svg")
  .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
  .attr("preserveAspectRatio", "xMidYMid meet")
  .classed("responsive-svg", true)
  .style("width", "100%")
  .style("height", "auto");

const chart = svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const subgroups = ["G", "F", "B"];
const color = d3.scaleOrdinal()
  .domain(subgroups)
  .range(["#4caf50", "#ffb74d", "#e57373"]);

const x = d3.scaleBand()
  .domain(["M", "F"])
  .range([0, width])
  .padding(0.3);

const y = d3.scaleLinear()
  .range([height, 0]);

const xAxisGroup = chart.append("g")
  .attr("transform", `translate(0,${height})`);
const yAxisGroup = chart.append("g");

const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0)
  .style("position", "absolute")
  .style("background", "#fff")
  .style("padding", "6px")
  .style("border", "1px solid #ccc")
  .style("border-radius", "4px")
  .style("pointer-events", "none");

// Load CSV
d3.csv("CSV/Gender_Health.csv", d3.autoType).then(rawData => {
  const years = Array.from(new Set(rawData.map(d => d.Year))).sort();

  // Populate HTML <select>
  const dropdown = d3.select("#yearSelector");
  dropdown.selectAll("option")
    .data(years)
    .join("option")
    .attr("value", d => d)
    .text(d => d);

  // Initial chart
  updateChart(years[0]);

  dropdown.on("change", function() {
    updateChart(this.value);
  });

  function updateChart(selectedYear) {
    const yearDataRaw = rawData.filter(d => d.Year === +selectedYear);

    const data = ["M", "F"].map(sex => {
      const filtered = yearDataRaw.filter(d => d["Sex_M/F"] === sex);
      let obj = {Sex: sex, G: 0, F: 0, B: 0};
      filtered.forEach(d => {
        obj[d.Health_Status] = d.Value;
      });
      return obj;
    });

    const stack = d3.stack().keys(subgroups);
    const series = stack(data);

    y.domain([0, 100]);

    chart.selectAll(".barGroup").remove();

    const groups = chart.selectAll(".barGroup")
      .data(data)
      .join("g")
      .attr("class", "barGroup")
      .attr("transform", d => `translate(${x(d.Sex)},0)`);

    groups.selectAll("rect")
      .data((d, i) =>
        series.map(s => ({
          key: s.key,
          data: s[i]
        }))
      )
      .join("rect")
      .attr("width", x.bandwidth())
      .attr("y", d => y(d.data[1]))
      .attr("height", d => y(d.data[0]) - y(d.data[1]))
      .attr("fill", d => color(d.key))
      .on("mouseover", (event, d) => {
        const sex = d.data.data?.Sex || (d.data.index === 0 ? "M" : "F");
        tooltip.transition().duration(200).style("opacity", 0.9);
        tooltip.html(
          `<strong>Sex:</strong> ${sex}<br>` +
          `<strong>Status:</strong> ${d.key}<br>` +
          `<strong>Value:</strong> ${d.data.data?.[d.key] ?? ""}%`
        )
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", () => {
        tooltip.transition().duration(500).style("opacity", 0);
      });

    xAxisGroup.call(d3.axisBottom(x));
    yAxisGroup.call(d3.axisLeft(y).ticks(5).tickFormat(d => d + "%"));
  }
});
