// Section 2 loads analysis-ready JSON produced by the Python pipeline
// (pipeline/process_data.py). All grouping/aggregation happens offline, so the
// browser just renders pre-computed views.
const DATA_DIR = './data/processed';

document.addEventListener('DOMContentLoaded', function () {
    Promise.all([
        d3.json(`${DATA_DIR}/sales_by_region.json`),
        d3.json(`${DATA_DIR}/esports_timeline.json`),
        d3.json(`${DATA_DIR}/esports_by_genre.json`),
        d3.json(`${DATA_DIR}/sales_over_time.json`),
        d3.json(`${DATA_DIR}/top_publishers.json`)
    ]).then(function ([pieData, esportsTimeline, genreData, salesOverTime, topPublishers]) {
        // Pie chart: regional sales share + each region's top 5 games.
        piechart(pieData);

        // Line chart: total esports earnings per year, filterable by game.
        LineChart(esportsTimeline["All"]);
        const selection = document.getElementById("gameSelector");
        selection.addEventListener("change", function () {
            LineChart(esportsTimeline[selection.value] || []);
        });

        // Bar chart: esports earnings/tournaments/players by genre.
        barChart(genreData);

        // Stacked-area chart: regional sales by release year.
        areaChart(salesOverTime);

        // Horizontal bar chart: best-selling publishers.
        publisherChart(topPublishers);
    }).catch(error => {
        console.error("Error loading processed data:", error);
    });
});

function LineChart(data) {
    d3.select("#linec_svg").selectAll("*").remove();

    const container = d3.select("#linec_svg").node().parentNode;
    const containerWidth = container.getBoundingClientRect().width;

    const margin = { top: 50, right: 50, bottom: 50, left: 70 };
    const width = containerWidth - margin.left - margin.right; // Use container width
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select("#linec_svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const xscale = d3.scaleLinear()
        .domain(d3.extent(data, d => d.Year))
        .range([0, width]);

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xscale).tickFormat(d3.format("d")));

    const yscale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.Earnings)])
        .range([height, 0]);

    svg.append("g")
        .call(d3.axisLeft(yscale));

    const gradient = svg.append("defs").append("linearGradient")
        .attr("id", "line-gradient")
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", 0)
        .attr("y1", yscale(0))
        .attr("x2", 0)
        .attr("y2", yscale(d3.max(data, d => d.Earnings)));

    gradient.selectAll("stop")
        .data([
            { offset: "0%", color: "#717171" },
            { offset: "50%", color: "#dd9700" },
            { offset: "100%", color: "red" }
        ])
        .enter().append("stop")
        .attr("offset", d => d.offset)
        .attr("stop-color", d => d.color);

    svg.append("path")
        .datum(data)
        .attr("fill", "none")
        .attr("stroke", "url(#line-gradient)")
        .attr("stroke-width", 4)
        .attr("d", d3.line()
            .x(d => xscale(d.Year))
            .y(d => yscale(d.Earnings))
        );

    svg.selectAll("circle")
        .data(data)
        .enter().append("circle")
        .attr("cx", d => xscale(d.Year))
        .attr("cy", d => yscale(d.Earnings))
        .attr("r", 4)
        .attr("fill", "#dd9700")
        .attr("stroke", "black")
        .attr("stroke-width", 1.5);
}

function barChart(data) {
    d3.select("#barc_svg").selectAll("*").remove();

    const container = d3.select("#barc_svg").node().parentNode;
    const containerWidth = container.getBoundingClientRect().width;

    const margin = { top: 20, right: 50, bottom: 130, left: 120 };
    const width = containerWidth - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    const svg = d3.select("#barc_svg")
        .attr("width", containerWidth)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    const xscale = d3.scaleBand()
        .domain(data.map(d => d.genre))
        .range([0, width])
        .padding(0.2);

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xscale))
        .selectAll("text")
        .attr("transform", "translate(-10,0)rotate(-15)")
        .style("text-anchor", "end")
        .style("font-size", "12px");

    const yscale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.totalEarnings)])
        .range([height, 0]);
    
    svg.append("g")
        .call(d3.axisLeft(yscale))
        .selectAll("text")
        .style("font-size", "12px");
    
    const colorscale = d3.scaleOrdinal()
    .domain(data.map(d => d.genre))
    .range(["#FFC300", "#FF5733", "#C70039", "#900C3F", "#581845"]);

    svg.selectAll(".bar")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => xscale(d.genre))
        .attr("y", d => yscale(d.totalEarnings))
        .attr("width", xscale.bandwidth())
        .attr("height", d => height - yscale(d.totalEarnings))
        .attr("fill", d => colorscale(d.genre))
        .attr("stroke", "black")
        .attr("stroke-width", 1.5)
        .on("mouseover", function (event, d) {
            d3.select(this).attr("opacity", 0.7);
            tooltip
                .style("opacity", 1)
                .html(`
                    <span class="tooltip-title"><strong>${d.genre}</strong></span><br>
                    <span class="tooltip-sub">Total Earnings: $${d3.format(",.0f")(d.totalEarnings)}</span><br>
                    <span class="tooltip-sub">Total Tournaments: ${d.totalTournaments.toLocaleString()}</span><br>
                    <span class="tooltip-sub">Total Players: ${d.totalPlayers.toLocaleString()}</span>
                `)
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 20 + "px");
        })
        .on("mousemove", function (event) {
            tooltip
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 20 + "px");
        })
        .on("mouseout", function () {
            d3.select(this).attr("opacity", 1);
            tooltip.style("opacity", 0);
        });

    svg.selectAll(".label")
        .data(data)
        .enter()
        .append("text")
        .attr("x", d => xscale(d.genre) + xscale.bandwidth() / 2)
        .attr("y", d => yscale(d.totalEarnings) - 5)
        .attr("text-anchor", "middle")
        .attr("font-size", 12)
        .attr("fill", "#2b2b33")
        .attr("font-family", "'Poppins', sans-serif")
        // Compact currency (e.g. "$644M") so labels don't overrun neighbouring bars.
        .text(d => "$" + d3.format(".3s")(d.totalEarnings).replace("G", "B"));
}

function piechart(pieData) {
    const width = 500;
    const height = 500;
    const radius = Math.min(width, height) / 2 - 20;

    d3.select("#piechart").selectAll("*").remove();

    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    const svg = d3.select("#piechart")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${width / 2}, ${height / 2})`);

    const color = d3.scaleOrdinal()
        .domain(pieData.map(d => d.region))
        .range(["#8DD3C7", "#FFFFB3", "#BEBADA", "#FB8072", "#80B1D3"]);
    const pie = d3.pie().value(d => d.sales);

    const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(radius);

    const arcs = svg.selectAll(".arc")
        .data(pie(pieData))
        .enter()
        .append("g")
        .attr("class", "arc");

    arcs.append("path")
        .attr("d", arc)
        .attr("fill", d => color(d.data.region))
        .on("mouseover", function (event, d) {
            d3.select(this).attr("opacity", 0.7);

            const topGamesHtml = d.data.topGames
                .map((game, i) => `
                    <li style="color: ${["#FBB4AE", "#B3CDE3", "#CCEBC5", "#DECBE4", "#FED9A6"][i]}">
                        ${game.name}: $${game.sales.toFixed(2)}M
                    </li>`)
                .join("");

            tooltip.style("opacity", 1)
                .html(`
                    <span class="tooltip-title"><strong>${d.data.label}</strong></span><br>
                    <span class="tooltip-sub">Total Sales: $${d.data.sales.toFixed(2)}M</span><br>
                    <span class="tooltip-sub"><strong>Top 5 Games:</strong></span>
                    <ul>${topGamesHtml}</ul>
                `)
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 20 + "px");
        })
        .on("mousemove", function (event) {
            tooltip.style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 20 + "px");
        })
        .on("mouseout", function () {
            d3.select(this).attr("opacity", 1);
            tooltip.style("opacity", 0);
        });

        arcs.append("text")
            .attr("transform", d => `translate(${arc.centroid(d)})`)
            .attr("text-anchor", "middle")
            .style("font-size", "10px")
            .style("fill", "#000000")
            .style("font-family", "'Poppins', sans-serif")
            .style("font-weight", "normal")
            .text(d => d.data.label);
}

// --------------------------------------------------------------------------- //
// Stacked-area chart: regional video-game sales by release year
// --------------------------------------------------------------------------- //
function areaChart(data) {
    d3.select("#areac_svg").selectAll("*").remove();

    const container = d3.select("#areac_svg").node().parentNode;
    const containerWidth = container.getBoundingClientRect().width;

    const margin = { top: 30, right: 160, bottom: 50, left: 70 };
    const width = containerWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const regions = ["NA_Sales", "EU_Sales", "JP_Sales", "Other_Sales"];
    const labels = {
        NA_Sales: "North America", EU_Sales: "Europe",
        JP_Sales: "Japan", Other_Sales: "Rest of World"
    };
    const color = d3.scaleOrdinal()
        .domain(regions)
        .range(["#1f77b4", "#ff7f0e", "#d62728", "#2ca02c"]);

    const svg = d3.select("#areac_svg")
        .attr("width", containerWidth)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
        .domain(d3.extent(data, d => d.year))
        .range([0, width]);

    const stacked = d3.stack().keys(regions)(data);

    const y = d3.scaleLinear()
        .domain([0, d3.max(stacked[stacked.length - 1], d => d[1])])
        .nice()
        .range([height, 0]);

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    svg.append("g").call(d3.axisLeft(y));

    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2).attr("y", -50)
        .attr("text-anchor", "middle").style("font-size", "12px")
        .text("Sales (millions of units)");

    const area = d3.area()
        .x(d => x(d.data.year))
        .y0(d => y(d[0]))
        .y1(d => y(d[1]))
        .curve(d3.curveCatmullRom);

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip").style("opacity", 0);

    svg.selectAll(".layer")
        .data(stacked)
        .enter().append("path")
        .attr("class", "layer")
        .attr("fill", d => color(d.key))
        .attr("opacity", 0.85)
        .attr("d", area)
        .on("mousemove", function (event, d) {
            d3.select(this).attr("opacity", 1);
            tooltip.style("opacity", 1)
                .html(`<span class="tooltip-title">${labels[d.key]}</span>`)
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 20 + "px");
        })
        .on("mouseout", function () {
            d3.select(this).attr("opacity", 0.85);
            tooltip.style("opacity", 0);
        });

    // Legend
    const legend = svg.append("g")
        .attr("transform", `translate(${width + 20}, 0)`);
    regions.forEach((r, i) => {
        const row = legend.append("g").attr("transform", `translate(0, ${i * 22})`);
        row.append("rect").attr("width", 14).attr("height", 14)
            .attr("fill", color(r)).attr("opacity", 0.85);
        row.append("text").attr("x", 20).attr("y", 12)
            .style("font-size", "12px").text(labels[r]);
    });
}

// --------------------------------------------------------------------------- //
// Horizontal bar chart: best-selling publishers by global sales
// --------------------------------------------------------------------------- //
function publisherChart(data) {
    d3.select("#pubc_svg").selectAll("*").remove();

    const container = d3.select("#pubc_svg").node().parentNode;
    const containerWidth = container.getBoundingClientRect().width;

    const margin = { top: 20, right: 80, bottom: 40, left: 150 };
    const width = containerWidth - margin.left - margin.right;
    const height = data.length * 32;

    const svg = d3.select("#pubc_svg")
        .attr("width", containerWidth)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.globalSales)])
        .range([0, width]);

    const y = d3.scaleBand()
        .domain(data.map(d => d.publisher))
        .range([0, height])
        .padding(0.18);

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(6));

    // Trim corporate suffixes so axis labels fit; the tooltip keeps the full name.
    const shortPublisher = name => name
        .replace(/ (Computer|Digital) Entertainment$/, "")
        .replace(/ Game Studios$/, "")
        .replace(/ Interactive$/, "")
        .replace(/ Games$/, "");

    svg.append("g").call(d3.axisLeft(y).tickFormat(shortPublisher)).selectAll("text")
        .style("font-size", "12px");

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip").style("opacity", 0);

    svg.selectAll(".bar")
        .data(data)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", 0)
        .attr("y", d => y(d.publisher))
        .attr("width", d => x(d.globalSales))
        .attr("height", y.bandwidth())
        .attr("fill", "#C70039")
        .on("mouseover", function (event, d) {
            d3.select(this).attr("opacity", 0.7);
            tooltip.style("opacity", 1)
                .html(`
                    <span class="tooltip-title">${d.publisher}</span><br>
                    <span class="tooltip-sub">Global Sales: ${d.globalSales.toLocaleString()}M units</span><br>
                    <span class="tooltip-sub">Titles Released: ${d.titles.toLocaleString()}</span>
                `)
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 20 + "px");
        })
        .on("mousemove", function (event) {
            tooltip.style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 20 + "px");
        })
        .on("mouseout", function () {
            d3.select(this).attr("opacity", 1);
            tooltip.style("opacity", 0);
        });

    svg.selectAll(".value")
        .data(data)
        .enter().append("text")
        .attr("x", d => x(d.globalSales) + 6)
        .attr("y", d => y(d.publisher) + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .style("font-size", "11px")
        .text(d => d3.format(",.0f")(d.globalSales) + "M");
}