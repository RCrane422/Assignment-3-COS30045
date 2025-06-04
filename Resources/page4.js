const width = 1060;
const height = 700;

const svg = d3.select("#map")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

const projection = d3.geoNaturalEarth1()
    .scale(160)
    .translate([width / 2, height / 2]);

const path = d3.geoPath().projection(projection);

const tooltip = d3.select("#map")
    .append("div")
    .style("position", "absolute")
    .style("background", "white")
    .style("padding", "6px")
    .style("border", "1px solid #aaa")
    .style("border-radius", "4px")
    .style("pointer-events", "none")
    .style("opacity", 0);

const colorScale = d3.scaleSequential()
    .domain([0, 35])
    .interpolator(d3.interpolateReds);

let geoDataGlobal;
let csvDataGlobal;

Promise.all([
    d3.json("Resources/countries.json"),
    d3.csv("CSV/Health_Risk3.csv")
]).then(([geoData, csvData]) => {
    geoDataGlobal = geoData;
    csvDataGlobal = csvData;

    updateMap("SP_DS");

    const zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on("zoom", (event) => {
            svg.selectAll("path").attr("transform", event.transform);
        });

    svg.call(zoom);
}).catch(error => {
    console.error("Error loading data:", error);
});

function updateMap(selectedMeasure) {
    const labelText = selectedMeasure === "SP_DS" ? "Smoking" : "Vaping";

    const dataMap = new Map(
        csvDataGlobal
            .filter(d => d.MEASURE === selectedMeasure)
            .map(d => [d.REF_AREA, +d.OBS_VALUE])
    );

    const paths = svg.selectAll("path")
        .data(geoDataGlobal.features);

    paths.enter()
        .append("path")
        .merge(paths)
        .attr("d", path)
        .attr("fill", d => {
            const value = dataMap.get(d.properties.iso_a3 || d.id);
            return value ? colorScale(value) : "#cccccc";
        })
        .on("mouseover", function (event, d) {
            d3.select(this).attr("fill", "#99c2b1");
            const value = dataMap.get(d.properties.iso_a3 || d.id);
            tooltip.transition().duration(200).style("opacity", 0.9);
            tooltip.html(`<strong>${d.properties.name}</strong><br>${labelText}: ${value ? value + "%" : "No data"}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function (event, d) {
            const value = dataMap.get(d.properties.iso_a3 || d.id);
            d3.select(this).attr("fill", value ? colorScale(value) : "#cccccc");
            tooltip.transition().duration(300).style("opacity", 0);
        });

    paths.exit().remove();
}

d3.select("#riskSelector").on("change", function () {
    updateMap(this.value);
});
