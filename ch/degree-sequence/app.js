//node ids are in order in which nodes come in existence
var nodes = [
            {id: 1, degree:4,},
            {id: 2, degree:4,},
            {id: 3, degree:4,},
            {id: 4, degree:4,},
            {id: 5, degree:4,},
            {id: 6, degree:4,},
];

var links = [
            {source:0, target:1},
            {source:0, target:2},
            {source:0, target:3},
            {source:0, target:4},
            {source:1, target:2},
            {source:2, target:3},
            {source:3, target:4},
            {source:4, target:1},
            {source:5, target:1},
            {source:5, target:2},
            {source:5, target:3},
            {source:5, target:4},
];

//universal width and height let index.html control svg dimensions when needed
var lastNodeId = nodes.length;
var w = univSvgWidth ? univSvgWidth : 616,
    h = univSvgHeight ? univSvgHeight :400,
    rad = 12;

//set initial positions for quick convergence
nodes.forEach(function(d, i) {
  d.y = w / lastNodeId * i;
  if(i%2==0)
    d.x = d.y;
  else 
    d.x = w - d.y;
});

var svg = d3.select("#svg-wrap")
            .append("svg")
            .attr("width", w)
            .attr("height", h);

var dragLine = svg.append("path")
									.attr("class", "dragLine hidden")
									.attr("d", "M0,0L0,0");

var edges = svg.append("g")
								.selectAll(".edge");

var vertices = svg.append("g")
									.selectAll(".vertex");

var force = d3.layout.force()
            .nodes(nodes)
            .links(links)
            .size([w, h])
            .linkDistance(100)
            .linkStrength(1)
            .charge(-400)
            .chargeDistance((w+h)/2)
            .gravity(0.12)
            .on("tick",tick)
            .start();

var colors = d3.scale.category10();

var mousedownNode = null, mouseupNode = null;

var clrBtn = d3.select("#clear-graph");
clrBtn.on("click", clearGraph);


function resetMouseVar(){
	mousedownNode = null;
	mouseupNode = null;
}

//empties the graph
function clearGraph(){
  nodes.splice(0);
  links.splice(0);
  lastNodeId = 0;
  restart();
  showGraphLatex();
}

//update the simulation
function tick() {

  edges.attr("x1", function(d) { return d.source.x; })
       .attr("y1", function(d) { return d.source.y; })
       .attr("x2", function(d) { return d.target.x; })
       .attr("y2", function(d) { return d.target.y; });

  //here vertices are g.vertex elements
  vertices.attr('transform', function(d) {
    return 'translate(' + d.x + ',' + d.y + ')';
  });

}

function addNode(){
  if(d3.event.button==0){
    var coords = d3.mouse(this);
    var newNode = {x:coords[0], y:coords[1], id: ++lastNodeId, degree:0,};
    nodes.push(newNode);
    restart();
    showGraphLatex();
  }
}

//d is data, i is index according to selection
function removeNode(d, i){
  //to make ctrl-drag works for mac/osx users
  if(d3.event.ctrlKey) return;
  var linksToRemove = links.filter(function(l){
    return l.source===d || l.target===d;
  });
  linksToRemove.map(function(l) {
    l.source.degree--;
    l.target.degree--;
    links.splice(links.indexOf(l), 1);
  });
  nodes.splice(nodes.indexOf(d),1);
  d3.event.preventDefault();
  restart();
  showGraphLatex();
}

function removeEdge(d, i){
  d.source.degree--;
  d.target.degree--;
  links.splice(links.indexOf(d),1);
  d3.event.preventDefault();
  restart();
  showGraphLatex();
}

function beginDragLine(d){
  //event must propagate till g.vertex so that force.drag could work
  //stop propagation at .vertex in restart() so that addNode isn't fired

  //to prevent dragging of svg in firefox
	d3.event.preventDefault();
	if(d3.event.ctrlKey || d3.event.button!=0) return;
	mousedownNode = d;
	dragLine.classed("hidden", false)
					.attr("d", "M" + mousedownNode.x + "," + mousedownNode.y + 
						"L" + mousedownNode.x + "," + mousedownNode.y);
}

function updateDragLine(){
	if(!mousedownNode) return;
	dragLine.attr("d", "M" + mousedownNode.x + "," + mousedownNode.y + 
									"L" + d3.mouse(this)[0] + "," + d3.mouse(this)[1]);
}

function hideDragLine(){
	dragLine.classed("hidden", true);
	resetMouseVar();
	restart();
}

//no need to call hideDragLine in endDragLine
//mouseup on vertices propagates to svg which calls hideDragLine
function endDragLine(d){
	if(!mousedownNode || mousedownNode===d) return;
	//return if link already exists
	for(var i=0; i<links.length; i++){
		var l = links[i];
		if((l.source===mousedownNode && l.target===d) || (l.source===d && l.target===mousedownNode)){
			return;
		}
	}
  mousedownNode.degree++;
  d.degree++;
	var newLink = {source: mousedownNode, target:d};
	links.push(newLink);
  showGraphLatex();
}

//one response per ctrl keydown
var lastKeyDown = -1;

function keydown(){
	if(lastKeyDown !== -1) return;
	lastKeyDown = d3.event.key;

	if(lastKeyDown === "Control"){
		vertices.call(force.drag);
	}
}

function keyup(){
	lastKeyDown = -1;
	if(d3.event.key === "Control"){
		vertices.on("mousedown.drag", null);
	}
}

//updates the graph by updating links, nodes and binding them with DOM
//interface is defined through several events
function restart(){
  edges = edges.data(links, function(d){return "v"+d.source.id+"-v"+d.target.id;});

  edges.enter()
        .append("line")
        .attr("class","edge")
        .on("mousedown", function(){d3.event.stopPropagation();})
        .on("contextmenu", removeEdge)
        //.append("title")
        //.text(function(d){return "v"+d.source.x+"-v"+d.target.x; });
        .on("mouseover", function(d){
        	var thisEdge = d3.select(this);
          if(thisEdge.select("title").empty()){
            thisEdge.append("title")
        		        .text("v"+d.source.id+"-v"+d.target.id);
          }
        });

  edges.exit().remove();

  //vertices are known by id
  vertices = vertices.data(nodes, function(d){return d.id;});

  //update degree
  vertices.selectAll("text")
          .text(function(d){return d.degree;});

  var g = vertices.enter()
                  .append("g")
                  .attr("class", "vertex")
                  //so that force.drag and addNode don't interfere
                  //mousedown is initiated on circle which is stopped at .vertex
                  .on("mousedown", function(){d3.event.stopPropagation();});



  g.append("circle")
    .attr("r", rad)
    .style("fill", function(d,i){
    	return colors(d.id);
    })
    .on("mousedown", beginDragLine)
    .on("mouseup", endDragLine)
    .on("mouseover", function(d){
    	var thisVertex = d3.select(this);
      if(thisVertex.select("title").empty()){
        thisVertex.append("title")
    		          .text("v"+d.id);
      }
    })
    .on("contextmenu", removeNode);

  g.append("text")
    .attr("x", 0)
    .attr("y", 4)
    .text(function(d){
      return d.degree;
    });
    
  vertices.exit().remove();
  force.start();
}

//further interface
svg.on("mousedown", addNode)
	  .on("mousemove", updateDragLine)
	  .on("mouseup", hideDragLine)
	  .on("contextmenu", function(){d3.event.preventDefault();})
	  .on("mouseleave", hideDragLine);

d3.select(window)
  .on('keydown', keydown)
  .on('keyup', keyup);

restart();
showGraphLatex();

//shows order and size of graph
function showGraphLatex () {
  var degSeq = nodes.map(function(v){return v.degree;});
  //sort in decreasing order
  degSeq.sort(function(a, b){return b-a;});

  var l = "\\[\\text{Degree Sequence}=(" ;
  degSeq.forEach(function(d, i){
    if(i !== degSeq.length-1)
      l += d + ",";
    else
      l += d;
    if(i%15 == 14)
      l += "\\\\";
  });
  l += ")\\]";
  document.getElementById("svg-output").textContent = l;
  //recall mathjax
  MathJax.Hub.Queue(["Typeset",MathJax.Hub]);
}
