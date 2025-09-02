document.addEventListener('DOMContentLoaded', function () {
    bubbleChart();
});

function bubbleChart() {
    var margin = {
        top: 152,
        right: 50,
        bottom: 150,
        left: 50
    },
    width = 1300 - margin.left - margin.right,
    height = 1800 - margin.top - margin.bottom;
    
    var back_col = "white";
    var txt_col_a = "black";

    var black_col = "black";

    var vote_low = "white"
    var vote_high = "white"

    var minRating = 0;
    var maxRating = 5;
    var selectedGenres = ['Puzzle', 'Shooter', 'Strategy', 'RPG', 'Adventure', 'Platform', 'Others'];

    let genreColors = {
        'Puzzle': '#2ca02c',
        'Shooter': '#1f77b4',
        'Platform': '#ff007f',
        'RPG': '#4d0f58',
        'Adventure': '#ff7f0e',
        'Strategy': '#d62728',
        'Others': '#8c564b'
    };

    

    var svg = d3.select("#bubble-chart")
        .attr('width', width + margin.left + margin.right )
        .attr('height', height + margin.top + margin.bottom - 800)
        .style("display", "block")
        .style("margin", "0px auto 0px auto")
        .style("background", back_col)
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',-100)');

    var defs0 = svg.append("defs")
        .append("radialGradient")
        .attr("id", "radial")
        .attr("cx", "50%")
        .attr("cy", "50%")
        .attr("r", "50%")
        .attr("fx", "50%")
        .attr("fy", "50%")

    defs0.append("stop")
        .attr("offset", "0%")
        .attr("style", "stop-color:black; stop-opacity:0.8")

    defs0.append("stop")
        .attr("offset", "100%")
        .attr("style", "stop-color:black; stop-opacity:0")

    var defs1 = svg.append("defs")
        .append("radialGradient")
        .attr("id", "radial2")
        .attr("cx", "50%")
        .attr("cy", "50%")
        .attr("r", "50%")
        .attr("fx", "50%")
        .attr("fy", "50%")

    defs1.append("stop")
        .attr("offset", "0%")
        .attr("style", "stop-color:red; stop-opacity:0.8")

    defs1.append("stop")
        .attr("offset", "100%")
        .attr("style", "stop-color:red; stop-opacity:0")

    function parsePlays(plays) {
        if (plays.endsWith('K')) {
            return parseFloat(plays.replace('K', '')) * 1000;
        } else {
            return parseFloat(plays);
        }
    }

    function extractYear(dateString) {
        const date = new Date(dateString);
        if (isNaN(date)) {
            return 2025;
        }
        return date.getFullYear();
    }

    function giveGenre(genres) {
        const topGenres = ['Puzzle', 'Shooter', 'Strategy', 'RPG', 'Adventure', 'Platform'];
        for (const genre of topGenres) {
            if (genres.includes(genre)) {
                return genre;
            }
        }
        return 'Others';
    }

    d3.csv('./test/data/Popular_Games.csv', ({Title, Team, Plays, Rating, Genres, "Release Date": ReleaseDate}) => ({
        Title: Title,
        Team: Team,
        Plays: parsePlays(Plays),
        Rating: +Rating,
        Genres: giveGenre(Genres),
        ReleaseYear: extractYear(ReleaseDate)
    })).then(value => {
        data = value

        var f = d3.format(".0f");
        var comma = d3.format(",");

        var worker = new Worker("js/worker_games.js");

        worker.postMessage({
            nodes: data
        });

        worker.onmessage = function (event) {
            switch (event.data.type) {
                case 'tick':
                    return ticked(event.data);
                case 'end':
                    return ended(event.data);
            }
        };

        var g = svg.append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        var loading = g.append("text")
            .attr("x", (width / 2) - 50)
            .attr("y", -20)
            .text("loading ...")
            .style("font-size", "11px")
            .style("fill", txt_col_a)
            .style("alignment-baseline", "middle")
            .style("text-anchor", "middle")
            .attr("transform", `translate(0, 0)`);

        var bar = g.append('line')
            .attr('x1', 300)
            .attr('x2', width - 400)
            .attr('y1', 0)
            .attr('y2', 0)
            .style('stroke', '#dbdbdb')
            .style('stroke-linecap', 'round')
            .style('stroke-width', '5');

        var progressBar = g.append('line')
            .attr('x1', 300)
            .attr('x2', 300)
            .attr('y1', 0)
            .attr('y2', 0)
            .style('stroke', '#0075ff')
            .style('stroke-linecap', 'round')
            .style('stroke-width', '5');


        var scale = d3.scaleLinear()
            .domain([0, 1])
            .range([300, width - 400]);

        function ticked(data) {
            progressBar.transition().duration(10)
                .attr('x2', scale(data.progress));
        }

        function ended(data) {

            var nodes = data.nodes;
            progressBar.remove();
            bar.remove();
            loading.remove();

            var time_scale_draw = d3.scaleLinear()
                .domain([1980, 2025])
                .range([height, 0 - 20]);

            var circle_Scale = d3.scaleSqrt()
                .domain([0, 33000])
                .range([1, 14]);

            // rate stroke scale
            var rate_stroke = d3.scaleLinear()
                .domain([0.7, 4.8])
                .range([0, 1.7]);

            // rate opacity
            var rate_opacity = d3.scaleLinear()
                .domain([0, 5])
                .range([0, 1])

            d3.axisLeft(time_scale_draw)
                .ticks(10)
                .tickSizeInner(0)
                .tickSizeOuter(0)
                .tickPadding(10)
                .tickFormat(f);

            var bg = svg
                .append('image')
                .attr('xlink:href', "imgs/Outline2.png")
                .attr('width', 1150)
                .attr('height', 925)
                .style("opacity", 0.8)
                .attr("transform", "translate(55,80)");

            var years_data = [
                {
                    year: 1980,
                    position: 176,
                    length: 900,
                    x: 350,
                    op: 0.4
                },
                {
                    year: 1990,
                    position: 338,
                    length: 1000,
                    x: 270,
                    op: 0.4
                },
                {
                    year: 2000,
                    position: 512,
                    length: 1100,
                    x: 150,
                    op: 0.4
                },
                {
                    year: 2010,
                    position: 697,
                    length: 1200,
                    x: 50,
                    op: 0.4
                },
                {
                    year: 2020,
                    position: 897,
                    length: 1250,
                    x: 0,
                    op: 0.4
                }
            ];

            var years = svg.selectAll("line.year_line")
                .data(years_data)
                .join("line")
                .classed("year_line", true)
                .attr("x1", d => d.x)
                .attr("y1", d => d.position)
                .attr("x2", d => d.length)
                .attr("y2", d => d.position)
                .style("fill", "none")
                .style("stroke", "blue")
                .style("stroke-width", 0.8)
                .style("opacity", d => d.op)
                .style("stroke-dasharray", "5,2")
                .attr("transform", "translate(0,0)")

            var year_txt = svg.selectAll("text.year_txt")
                .data(years_data)
                .join("text")
                .classed("year_txt", true)
                .attr("x", d => d.x)
                .attr("y", d => d.position + 14)
                .text(d => d.year)
                .style("font-size", "18px")
                .style("fill", "grey")
                .style("alignment-baseline", "middle")
                .style("text-anchor", "start")
                .style("opacity", 0.7)
                .attr("transform", `translate(0, 0)`);

            var team = "";
            var selected_data = nodes.filter(d => d.Team == team);

            var line = d3.line()
                .x(d => d.x + margin.left * 3)
                .y(d => d.y)
                //.curve(d3.curveCardinal)
                .curve(d3.curveCatmullRom)

            var chart = svg.append("g")
                .attr("transform", "translate(" + width / 2.5 + " ,0)")

            var lines_grey = chart.selectAll("path.lines_grey")
                .data(nodes.filter(d => d.Team == "Riot"))
                .join("path")
                .classed("lines_grey", true)
                .attr("d", line(selected_data))
                .style("fill", "none")
                .style("stroke", black_col)
                .style("stroke-width", 0.6)
                .style("opacity", 0)

            lines_grey
                .attr("d", line(selected_data))

            var filteredData;
            var games;

            function renderBubbles() {
                // Recalculate filtered data based on the current filters (rating, genre, etc.)
                filteredData = nodes.filter(d =>
                    d.Rating >= minRating &&
                    d.Rating <= maxRating &&
                    selectedGenres.includes(d.Genres)
                );

                lines_grey.remove();

                games = chart.selectAll("g.go")
                    .data(filteredData, d => d.Title);

                games.exit().remove();

                games.select("circle")
                    .transition()
                    .duration(500)
                    .attr("r", d => circle_Scale(d.Plays))
                    .style("stroke-width", d => rate_stroke(d.Rating) * 2)
                    .style("stroke-opacity", d => rate_opacity(d.Rating));

                var newGames = games.enter().append("g").classed("go", true);

                newGames
                    .append("circle")
                    .classed("mo", true)
                    .attr("r", d => circle_Scale(d.Plays))
                    .attr("cx", d => d.x + margin.left * 3)
                    .attr("cy", d => d.y)
                    .style("fill", "white")
                    .style("stroke", d => genreColors[d.Genres] || 'black')
                    .style("stroke-width", d => rate_stroke(d.Rating) * 2)
                    .style("stroke-opacity", d => rate_opacity(d.Rating))
                    .style("opacity", 1);

                newGames
                    .on("mousemove", function (event, d) {
                        tooltipTitle.text(d.Title);
                        let formattedTeam;
                        try {
                            const parsedArray = JSON.parse(d.Team.replace(/'/g, '"'));
                            formattedTeam = parsedArray.join(", ");
                        } catch (error) {
                            formattedTeam = d.Team || "Unknown";
                        }
                        tooltipTeam.text("Team: " + formattedTeam + " | Year: " + d.ReleaseYear);
                        tooltipGenre.text("Genre: " + d.Genres);
                        tooltipRating.text("Total Plays: " + comma(d.Plays) + " | Rating: " + d.Rating);

                        // Adjust tooltip background size and position (unchanged from your code)
                        var maxSize = Math.max(
                            document.getElementById("tooltipTitle").getComputedTextLength(),
                            document.getElementById("tooltipTeam").getComputedTextLength(),
                            document.getElementById("tooltipGenre").getComputedTextLength(),
                            document.getElementById("tooltipRating").getComputedTextLength(),
                        );

                        tooltipBackground
                            .transition().duration(100)
                            .attr("x", -0.5 * maxSize * 1.2)
                            .attr("width", maxSize * 1.2);

                        tooltipWrapper
                            .transition().duration(100)
                            .attr("transform", "translate(" + (d.x + 750) + "," + (d.y + 50) + ")")
                            .style("opacity", 1);

                        team = d3.select(this).data()[0].Team;
                        lines_grey.remove().lower();

                        newGames.selectAll("circle.co").raise().remove();

                        d3.select(this)
                            .each(function (d) {
                                d3.select(this)
                                    .append("circle")
                                    .classed("co", true)
                                    .attr("r", circle_Scale(d.Plays) + 9)
                                    .attr("cx", d => d.x + margin.left * 3)
                                    .attr("cy", d => d.y)
                                    .style("fill", "none")
                                    .style("stroke", "url(#radial)")
                                    .style("stroke-width", 13)
                                    .lower();
                            }).raise();

                        newGames
                            .filter(d => d.Team == team)
                            .each(function (d, i) {
                                d3.select(this)
                                    .append("circle")
                                    .classed("co", true)
                                    .attr("r", (d, i) => circle_Scale(d.Plays) + 9)
                                    .attr("cx", d => d.x + margin.left * 3)
                                    .attr("cy", d => d.y)
                                    .style("fill", "none")
                                    .style("stroke", "url(#radial)")
                                    .style("stroke-width", 13)
                                    .lower()
                            }).raise()

                        selected_data = filteredData.filter(d => d.Team == team);

                        lines_grey = chart.selectAll("path.lines_grey")
                            .data(selected_data)
                            .join("path")
                            .classed("lines_grey", true)
                            .attr("d", line(selected_data))
                            .style("fill", "none")
                            .style("stroke", "black")
                            .style("stroke-width", 0.6)
                            .style("opacity", 0.7);

                    })
                    .on("mouseout", function (event) {
                        tooltipWrapper
                            .transition()
                            .duration(50)
                            .style("opacity", 0);

                        newGames.selectAll("circle.co").remove();
                        lines_grey.remove();
                    });
            }

            renderBubbles();

            d3.select("#minRating").on("input", function (event) {
                minRating = +this.value; // Parse as number
                d3.select("#minRatingValue").text(minRating); // Update displayed value
                renderBubbles();
            });

            d3.select("#maxRating").on("input", function (event) {
                maxRating = +this.value; // Parse as number
                d3.select("#maxRatingValue").text(maxRating); // Update displayed value
                renderBubbles();
            });

            d3.selectAll('input[name="genre"]').on("change", function (event) {
                selectedGenres = [];
                d3.selectAll('input[name="genre"]:checked').each(function () {
                    selectedGenres.push(this.value);
                });
                renderBubbles();
            });

            var tooltipWrapper = svg.append("g")
                .attr("class", "tooltip-wrapper")
                .attr("transform", "translate(0,0)")
                .style("opacity", 0);

            var tooltipBackground = tooltipWrapper.append("rect")
                .attr("class", "tooltip-background")
                .attr("x", 0)
                .attr("y", -28)
                .attr("rx", 10)
                .attr("ry", 10)
                .attr("width", 0)
                .attr("height", 112);

            var tooltipTeam = tooltipWrapper.append("text")
                .attr("class", "tooltip-director")
                .attr("id", "tooltipTeam")
                .attr("y", -4)
                .style("fill", "white")
                .text("");

            var tooltipGenre = tooltipWrapper.append("text")
                .attr("class", "tooltip-writer")
                .attr("id", "tooltipGenre")
                .attr("y", 12)
                .style("fill", "white")
                .text("");

            var tooltipTitle = tooltipWrapper.append("text")
                .attr("class", "tooltip-film")
                .attr("id", "tooltipTitle")
                .attr("y", 42)
                .style("fill", "white")
                .text("");

            var tooltipRating = tooltipWrapper.append("text")
                .attr("class", "tooltip-rank")
                .attr("id", "tooltipRating")
                .attr("y", 66)
                .style("fill", "white")
                .text("");
        }
    });
}