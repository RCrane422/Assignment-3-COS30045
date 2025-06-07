//  Dimensions & SVG Setup 
const margin = { top: 40, right: 40, bottom: 70, left: 70 };
const width = 800 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const svg = d3.select("#map")
  .append("svg")
  .attr("viewBox", `0 0 ${width + margin.left + margin.right + 200} ${height + margin.top + margin.bottom}`) // Extended width for legend
  .attr("preserveAspectRatio", "xMidYMid meet")
  .classed("responsive-svg", true)
  .style("width", "100%")
  .style("height", "auto");

const chart = svg.append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

//  Chart Scales and Axes 
const subgroups = ["Good/Very Good Health", "Fair", "Bad/Very Bad Health"];
const color = d3.scaleOrdinal()
  .domain(subgroups)
  .range(["#4caf50", "#ffb74d", "#e57373"]);

const x = d3.scaleBand()
  .domain(["Male", "Female"])
  .range([0, width])
  .padding(0.3);

const y = d3.scaleLinear().range([height, 0]);

const xAxisGroup = chart.append("g").attr("transform", `translate(0,${height})`);
const yAxisGroup = chart.append("g");

//  Tooltip Setup 
const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0)
  .style("position", "absolute")
  .style("background", "#fff")
  .style("padding", "6px")
  .style("border", "1px solid #ccc")
  .style("border-radius", "4px")
  .style("pointer-events", "none");

//  Load Data and Initialize 
d3.csv("CSV/Gender_Health.csv", d3.autoType).then(data => {
  if (!data || data.length === 0) {
    console.error("No data loaded or CSV is empty");
    return;
  }

  const years = Array.from(new Set(data.map(d => d.Year))).sort();

  const dropdown = d3.select("#yearSelector");
  dropdown.selectAll("option")
    .data(years)
    .join("option")
    .attr("value", d => d)
    .text(d => d);

  dropdown.on("change", function () {
    updateChart(+this.value);
  });

  updateChart(years[0]);

  //  Update Chart on Year Change 
  function updateChart(selectedYear) {
    const yearData = data.filter(d => d.Year === selectedYear);

    const groupedData = ["Male", "Female"].map(sex => {
      const code = sex === "Male" ? "M" : "F";
      const subset = yearData.filter(d => d["Sex_M/F"] === code);

      const healthMap = { G: "Good/Very Good Health", F: "Fair", B: "Bad/Very Bad Health" };
      const obj = { Sex: sex, "Good/Very Good Health": 0, Fair: 0, "Bad/Very Bad Health": 0 };

      subset.forEach(d => {
        const category = healthMap[d.Health_Status];
        if (category) obj[category] = d.Value;
      });

      return obj;
    });

    const stack = d3.stack().keys(subgroups);
    const stackedSeries = stack(groupedData);
    const maxY = d3.max(stackedSeries, s => d3.max(s, d => d[1]));
    y.domain([0, maxY]);

    chart.selectAll(".barGroup").remove();

    const groups = chart.selectAll(".barGroup")
      .data(groupedData)
      .join("g")
      .attr("class", "barGroup")
      .attr("transform", d => `translate(${x(d.Sex)},0)`);

    groups.selectAll("rect")
      .data((d, i) =>
        stackedSeries.map(s => ({
          key: s.key,
          data: s[i]
        }))
      )
      .join("rect")
      .attr("width", x.bandwidth())
      .attr("y", d => y(d.data[1]))
      .attr("height", d => y(d.data[0]) - y(d.data[1]))
      .attr("fill", d => color(d.key))
      .attr("rx", 5)
      .attr("ry", 5)
      .on("mouseover", (event, d) => {
        const sex = d.data.data?.Sex || (d.data.index === 0 ? "Male" : "Female");
        const val = d.data.data?.[d.key] ?? 0;
        tooltip.transition().duration(200).style("opacity", 0.9);
        tooltip.html(
          `<strong>Sex:</strong> ${sex}<br>` +
          `<strong>Status:</strong> ${d.key}<br>` +
          `<strong>Value:</strong> ${Math.round(val * 10) / 10}`
        )
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
      })
      .on("mouseout", () => {
        tooltip.transition().duration(500).style("opacity", 0);
      })
      .transition()
      .duration(750)
      .ease(d3.easeCubicInOut)
      .attr("y", d => y(d.data[1]))
      .attr("height", d => y(d.data[0]) - y(d.data[1]));

    xAxisGroup.call(d3.axisBottom(x));
    yAxisGroup.call(d3.axisLeft(y).ticks(5));

    chart.selectAll(".axis-label").remove();

    chart.append("text")
      .attr("class", "axis-label")
      .attr("x", width / 2)
      .attr("y", height + 50)
      .attr("text-anchor", "middle")
      .text("Gender");

    chart.append("text")
      .attr("class", "axis-label")
      .attr("x", -height / 2)
      .attr("y", -50)
      .style("text-anchor", "middle")
      .attr("transform", "rotate(-90)")
      .text("Value");

    //  Add Legend 
    const legendWidth = 200;
    const legendHeight = 20;

    const legend = chart.append("g")
      .attr("transform", `translate(${width + 20}, 20)`); 

    const legendItems = [
      { label: "Good/Very Good Health", color: "#4caf50", y: 15 },
      { label: "Fair", color: "#ffb74d", y: 35 },
      { label: "Bad/Very Bad Health", color: "#e57373", y: 55 }
    ];

    legendItems.forEach(({ label, color, y }) => {
      legend.append("line")
        .attr("x1", 10)
        .attr("y1", y)
        .attr("x2", 30)
        .attr("y2", y)
        .attr("stroke", color)
        .attr("stroke-width", 2);

      legend.append("text")
        .attr("x", 35)
        .attr("y", y + 5)
        .text(label)
        .style("font-size", "14px");
    });
  }
}).catch(error => {
  console.error("Error loading CSV:", error);
});

//  Navigation Toggle 
const navToggle = document.getElementById('navToggle');
const nav = document.querySelector('aside nav');

navToggle.addEventListener('click', () => {
  nav.classList.toggle('open');
});