let data, EsportHistory, GeneralEsports;

document.addEventListener('DOMContentLoaded', function () {
    Promise.all([
        d3.csv('./test/data/Video_Games_Sales.csv'),
        d3.csv('./test/data/Historical_Esport_Data.csv'),
        d3.csv('./test/data/General_Esport_Data.csv')
    ]).then(function (values) {
        console.log("Datasets are loaded!!");
        data = values[0];
        EsportHistory = values[1];
        GeneralEsports = values[2];

        const regions = ["NA_Sales", "EU_Sales", "JP_Sales", "Other_Sales"];
        const totalSales = {};
        const topGames = {};

        regions.forEach(region => {
            totalSales[region] = 0;
            topGames[region] = [];
        });

        data.forEach(row => {
            regions.forEach(region => {
                const sales = parseFloat(row[region]) || 0;
                totalSales[region] += sales;

                if (sales > 0) {
                    topGames[region].push({ name: row["Name"], sales });
                }
            });
        });

        Object.keys(topGames).forEach(region => {
            topGames[region].sort((a, b) => b.sales - a.sales);
            topGames[region] = topGames[region].slice(0, 5);
        });

        const pieData = Object.entries(totalSales).map(([region, sales]) => ({
            region,
            sales,
            topGames: topGames[region]
        }));

        console.log("Pie Chart Data:", pieData);
        piechart(pieData);

        EsportHistory.forEach(row => {
            row.Earnings = parseFloat(row.Earnings);
            row.Date = new Date(row.Date);
        });

        let adjusted_default_Data = d3.rollups(
            EsportHistory,
            v => d3.sum(v, d => d.Earnings),
            d => d.Date.getFullYear()
        ).map(([Year, Earnings]) => ({ Year, Earnings }));

        console.log("Default Line Chart Data:", adjusted_default_Data);
        LineChart(adjusted_default_Data);

        let selection = document.getElementById("gameSelector");
        selection.addEventListener("change", function () {
            const gameName = selection.value;
            let Selected_Game = EsportHistory.filter(d => d.Game === gameName);
            let adjusted_data = d3.rollups(
                Selected_Game,
                v => d3.sum(v, d => d.Earnings),
                d => d.Date.getFullYear()
            ).map(([Year, Earnings]) => ({ Year, Earnings }));

            console.log(`Filtered Data for Game "${gameName}":`, adjusted_data);
            LineChart(adjusted_data);
        });

        GeneralEsports.forEach(row => {
            row.TotalEarnings = parseFloat(row.TotalEarnings);
            row.TotalTournaments = parseInt(row.TotalTournaments, 10);
            row.TotalPlayers = parseInt(row.TotalPlayers, 10);
        });

        let genreData = d3.rollups(
            GeneralEsports,
            v => ({
                totalEarnings: d3.sum(v, d => d.TotalEarnings),
                totalTournaments: d3.sum(v, d => d.TotalTournaments),
                totalPlayers: d3.sum(v, d => d.TotalPlayers)
            }),
            d => d.Genre
        ).map(([genre, values]) => ({
            genre,
            totalEarnings: values.totalEarnings,
            totalTournaments: values.totalTournaments,
            totalPlayers: values.totalPlayers
        }));

        console.log("Bar Chart Data:", genreData);
        barChart(genreData);
    }).catch(error => {
        console.error("Error loading or processing CSV:", error);
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
                    <span class="tooltip-film"><strong>${d.genre}</strong></span><br>
                    <span class="tooltip-director">Total Tournaments: ${d.totalTournaments.toLocaleString()}</span><br>
                    <span class="tooltip-writer">Total Players: ${d.totalPlayers.toLocaleString()}</span>
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
        .attr("fill", "black")
        .text(d => d3.format(",")(d.totalEarnings));
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
                    <span class="tooltip-film"><strong>${d.data.region}</strong></span><br>
                    <span class="tooltip-director">Total Sales: $${d.data.sales.toFixed(2)}M</span><br>
                    <span class="tooltip-writer"><strong>Top 5 Games:</strong></span>
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
            .text(d => d.data.region);
}