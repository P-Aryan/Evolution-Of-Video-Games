importScripts("https://d3js.org/d3-collection.v1.min.js");
importScripts("https://d3js.org/d3-dispatch.v1.min.js");
importScripts("https://d3js.org/d3-quadtree.v1.min.js");
importScripts("https://d3js.org/d3-timer.v1.min.js");
importScripts("https://d3js.org/d3-force.v1.min.js");
importScripts("https://d3js.org/d3.v7.min.js");

onmessage = function(event) {

        var nodes = event.data.nodes

		var margin = { top: 152, right: 50, bottom: 150, left: 50 },
            height = 1500 - margin.top - margin.bottom;

		var time_scale = d3.scaleLinear()
			.domain([2025, 1980])
			.range([height-250, 0+205]);

	    var circle_Scale = d3.scaleSqrt()
            .domain([0, 33000])
			.range([1, 14]);

        var f_body = d3.forceManyBody()
        .strength(-15)
        .theta(1)
        
        var f_collide = d3.forceCollide()
        .strength(1)
        .radius(d => (circle_Scale(d.Plays)*1.3)+1)

        var f_x = d3.forceX()
        .x(0)
        .strength(0.08)

        var f_y = d3.forceY()
        .y((d,i) => time_scale(d.ReleaseYear))
        .strength(1)

        var simulation = d3.forceSimulation(nodes)
        .force("f_x", f_x)
        .force("f_y", f_y)
        .force("body", f_body)
        .force("collide", f_collide)
        .stop();

        for (var i = 0, n = 20; i < n; ++i) {
            postMessage({type: "tick", progress: i / n});
            simulation.tick();
        }
        postMessage({type: "end", nodes: nodes});
};