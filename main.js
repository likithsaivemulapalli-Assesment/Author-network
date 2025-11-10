async function run() {
    const data = await fetch('data/author_network.json').then(r => r.json());
  
    // Top-10 countries (others gray)
    const counts = d3.rollup(data.nodes, v => v.length, d => d.country || "Unknown");
    const top10 = Array.from(counts.entries()).sort((a,b)=>d3.descending(a[1],b[1])).slice(0,10).map(d=>d[0]);
    const color = d3.scaleOrdinal().domain(top10).range(d3.schemeTableau10);
    const fallback = "#A9A9A9";
  
    // Radius by degree
    const degExtent = d3.extent(data.nodes, d => d.degree || 0);
    const r = d3.scaleSqrt().domain([Math.max(0,degExtent[0]||0), Math.max(1,degExtent[1]||1)]).range([3,12]);
  
    const svg = d3.select("#chart");
    const {width, height} = svg.node().getBoundingClientRect();
  
    const link = svg.append("g").attr("stroke-linecap","round")
      .selectAll("line").data(data.links).join("line")
      .attr("class","link")
      .attr("stroke-width", d => Math.max(1, Math.sqrt(d.weight||1)));
  
    const node = svg.append("g").selectAll("circle")
      .data(data.nodes).join("circle")
      .attr("class","node")
      .attr("r", d => r(d.degree||0))
      .attr("fill", d => top10.includes(d.country) ? color(d.country) : fallback);
  
    const id2country = new Map(data.nodes.map(n => [n.id, n.country]));
    const tooltip = d3.select("#tooltip");
  
    node.on("mouseover", (event, d) => {
        const country = d.country;
        node.attr("opacity", n => (n.country === country ? 1 : 0.2));
        link.attr("opacity", l => {
          const s = l.source.id ?? l.source, t = l.target.id ?? l.target;
          return (id2country.get(s)===country && id2country.get(t)===country) ? 0.7 : 0.05;
        });
      })
      .on("mouseleave", () => { node.attr("opacity",1); link.attr("opacity",0.4); })
      .on("click", (event, d) => {
        tooltip.style("opacity",1)
          .html(`<div><b>${d.name || d.id}</b></div>
                 <div>Country: ${d.country || 'Unknown'}</div>
                 <div>Degree: ${d.degree ?? 0}</div>
                 <div>ID: ${d.id}</div>`)
          .style("left", (event.pageX+12)+"px")
          .style("top", (event.pageY+12)+"px");
      });
  
    svg.on("click", (e)=>{ if (e.target===svg.node()) tooltip.style("opacity",0); });
  
    // Controls
    const chargeInput = document.getElementById("charge");
    const collideInput = document.getElementById("collide");
    const linkStrengthInput = document.getElementById("linkStrength");
  
    let sim;
    function createSimulation() {
      if (sim) sim.stop();
      const charge = +chargeInput.value;
      const collideR = +collideInput.value;
      const linkStrength = +linkStrengthInput.value;
  
      sim = d3.forceSimulation(data.nodes)
        .force("link", d3.forceLink(data.links).id(d=>d.id).strength(linkStrength))
        .force("charge", d3.forceManyBody().strength(charge))
        .force("collide", d3.forceCollide().radius(d => Math.max(collideR, r(d.degree||0)+2)))
        .force("center", d3.forceCenter(width/2, height/2))
        .on("tick", ticked);
    }
  
    function ticked() {
      link.attr("x1", d=>d.source.x).attr("y1", d=>d.source.y)
          .attr("x2", d=>d.target.x).attr("y2", d=>d.target.y);
      node.attr("cx", d=>d.x).attr("cy", d=>d.y);
    }
  
    function drag(sim) {
      function dragstarted(event, d){ if(!event.active) sim.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y; }
      function dragged(event, d){ d.fx=event.x; d.fy=event.y; }
      function dragended(event, d){ if(!event.active) sim.alphaTarget(0); d.fx=null; d.fy=null; }
      return d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended);
    }
  
    createSimulation();
    node.call(drag(sim));
  
    chargeInput.addEventListener("input", createSimulation);
    collideInput.addEventListener("input", createSimulation);
    linkStrengthInput.addEventListener("input", createSimulation);
  }
  run();
  