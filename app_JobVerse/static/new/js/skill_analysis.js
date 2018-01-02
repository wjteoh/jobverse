var DATA_URL = '/data/';
var WIN_URL = '';

var navbar_Height = $("#navbar").height();
// console.log("navbar_Height", navbar_Height);
var window_height = $(window).height();   // returns height of browser viewport
var document_height = $(document).height();
console.log("window_height", window_height);
document.getElementById("content").style.height = 2115 + 'px';

//******************************************//
//                                          //
//              BIPARTITE CHART             //
//                                          //
//******************************************//
function drawBpGraph(data_arr, graph_header, is_Slider, search_item){
    $.getScript("http://d3js.org/d3.v4.min.js", function() {
    // console.log("data_arr:", data_arr);
    // update display titles
    $("#rel-svg").remove();

    var bpheight = 2180, bpwidth = 1100;
    document.getElementById("content").style.height = (bpheight + 15) + 'px';
    d3.select("#rel_graph")
        .attr("class", "bp_size");
    var color = d3.scale.category20c();
    var svg = d3.select("#rel_graph").append("svg")
        .attr("id", "rel-svg")
        .attr("width", bpwidth)
        .attr("height", bpheight)
        .style("display", "block")
        ;

    svg.append("text").attr("x",384).attr("y",14)
        .attr("class","header")
        .style("font-weight","bold")
        .text("Association between "+graph_header+" and Skill Groups")
        .transition().duration(850).style("opacity", 1);

    var g = svg.append("g")
        .attr("id", "rel-g");

    if (!is_Slider){
        g.transition().duration(750).attr("transform","translate(235,53)");
    }
    else{
        g.style("opacity", 0);
        g.attr("transform","translate(235,53)");
        g.transition().duration(750).style("opacity", 1);
    }

    var color_dict = colorizeData();

    var bp=viz.bP()
            .data(data_arr)
            .min(10)
            .pad(0)
            .height(1990)
            .width(300)
            .barSize(35)
            .edgeMode("straight")
            .fill(d=>color_dict[d.primary])
            .duration(250);
                
    g.call(bp);

    g.append("text").attr("x",-100).attr("y",-8)
        .style("text-anchor","middle")
        .style("fill","grey")
        .text(graph_header);
    g.append("text").attr("x", 550).attr("y",-8)
        .style("text-anchor","middle")
        .style("fill","grey")
        .text("Skill Group (Representative Skills)");

    g.append("text").attr("x", 150).attr("y",-2)
        .style("text-anchor","middle")
        .style("fill","grey")
        .style("font-size", "10px")
        .text(data_arr.length);

    g.append("line").attr("x1",-229).attr("x2",0);
    g.append("line").attr("x1",300).attr("x2",825);

    g.selectAll(".mainBars")
        .attr("id", function(d){ return d.key; })
        .on("mouseover",mouseover)
        .on("mouseout",mouseout)
        .on("click", click);

    g.selectAll(".mainBars").select("rect")
        .attr("id", function(d){ return d.key; })
        .on("mouseover",mouseover)
        .on("mouseout",mouseout);

    g.selectAll(".mainBars").append("text").attr("class","label")
        .attr("x",d=>(d.part=="primary"? -82: 82))
        .attr("y",d=>+6)
        .text(d=>d.key)
        .attr("text-anchor",d=>(d.part=="primary"? "end": "start"));
        
    g.selectAll(".mainBars").append("text").attr("class","perc")
        .attr("x",d=>(d.part=="primary"? -25: 25))
        .attr("y",d=>+6)
        .text(function(d){ return "(" + d3.format("0.1%")(d.percent) + ")"})
        .style("fill","grey")
        .attr("text-anchor",d=>(d.part=="primary"? "end": "start"));

    function colorizeData(){
        var pri_list_uniq = [], seen = new Set();
        outer:  
        for (var index = 0; index < data_arr.length; index++) {
            var value = data_arr[index][0];
            if (seen.has(value)) continue outer;
            seen.add(value);
            pri_list_uniq.push(value);
        }

        var color_dict = {};

        for (i = 0; i < pri_list_uniq.length; i++) {
            color_dict[pri_list_uniq[i]] = color(i);
        }
        return color_dict;
    }
    var stored_mouseover_bp;
    function mouseover(d){
        if (clicked !== 1){
            bp.mouseover(d);
            g.selectAll(".mainBars").select(".perc")
                .text(function(d){ return "(" + d3.format("0.1%")(d.percent) + ")"});

            var selectedBar = d3.select(this);
            // console.log("hoveredBar", selectedBar);
            selectedBar.select(".label").style('font-weight','bold');
            selectedBar.select(".perc").style('font-weight','bold'); 
        }   
    }
    function mouseout(d){
        if (clicked !== 1){
            bp.mouseout(d);
            g.selectAll(".mainBars").select(".perc")
                .text(function(d){ return "(" + d3.format("0.1%")(d.percent) + ")"});

            var selectedBar = d3.select(this);
            selectedBar.select(".label").style('font-weight','normal');
            selectedBar.select(".perc").style('font-weight','normal');
        }
    }
    var clicked = 0, stored_var = '';
    function click(d){
        // condition: none clicked
        console.log(d);
        if (clicked === 0){  
            stored_mouseover_bp = d;  // store for changing clicked bar usage
            clicked = 1; 
            // stored_var = $(this).attr('id'); 
            stored_var = d.key; 
            console.log("IF1");
        }
        // condition: clicked same bar
        // else if (clicked === 1 && stored_var === $(this).attr('id')){  
        else if (clicked === 1 && stored_var === d.key){  
            clicked = 0;
            stored_var = '';
            g.selectAll(".mainBars").select(".perc")
                .text(function(d){ return d3.format("0.1%")(d.percent)});
            console.log("IF2");
        }
        // condition: clicked different bar when clicked bar exist
        else if (clicked === 1 && stored_var !== d.key){  
            stored_var = d.key;
            bp.mouseout(stored_mouseover_bp);
            d3.selectAll(".label").style('font-weight','normal');
            d3.selectAll(".perc").style('font-weight','normal');
            d3.selectAll("rect").style('stroke-opacity',0);
            bp.mouseover(d);
            g.selectAll(".mainBars").select(".perc")
                .text(function(d){ return d3.format("0.1%")(d.percent)});
            // var selectedBar = d3.select(this);
            var selectedBar = d3.selectAll('.mainBars').filter(function(s){ return s.key == d.key});
            selectedBar.select(".label").style('font-weight','bold');
            selectedBar.select(".perc").style('font-weight','bold');
            console.log("IF3");
        }
        console.log(stored_var);
    }

    if (search_item !== 'null'){
        var search_datum;
        var searchedBar = d3.selectAll('.mainBars').filter(function(s){ 
            if (s.key == search_item){ search_datum = s; } 
            return s.key == search_item
            });
        g.selectAll(".mainBars").select(".perc")
            .text(function(d){ return d3.format("0.1%")(d.percent)});
        stored_mouseover_bp = search_datum;  // store for changing clicked bar usage
        clicked = 1; 
        stored_var = search_datum.key;
        bp.mouseover(search_datum);
        searchedBar.select(".label").style('font-weight','bold');
        searchedBar.select(".perc").style('font-weight','bold');
    }

    d3.select(self.frameElement).style("height", "800px");
    setTimeout(function(){
        $(".loader").fadeOut("fast");
    }, 150);
    });
}

//******************************************//
//                                          //
//               CHORD DIAGRAM              //
//                                          //
//******************************************//
function drawChordGraph(data_arr, graph_header, search_item){
    $.getScript("http://d3js.org/d3.v4.min.js", function() {
    // var chwidth = 1850, chheight = 660, x_title = 924, x_translate = 920, y_translate = 355, inner_r = 250, outer_r = 270, 
    var chwidth = 1500, chheight = 660, x_title = 924, x_translate = 750, y_translate = 355, inner_r = 250, outer_r = 270, 
        // y_cutoff = 259, upper_diff = 1.9, lower_diff = 3.3, shift_x = 760, skills_h = 480;  // for big screen
        y_cutoff = 259, upper_diff = 1.9, lower_diff = 3.3, shift_x = 750, skills_h = 480;  // for big screen
    if (window_height < 800){
        // chwidth = 1500, chheight = 595, x_title = 764, x_translate = 765, y_translate = 320, inner_r = 217, outer_r = 237, 
        chwidth = 1500, chheight = 595, x_title = 764, x_translate = 565, y_translate = 320, inner_r = 217, outer_r = 237, 
        y_cutoff = 226, upper_diff = 2.4, lower_diff = 5.0, shift_x = 565, skills_h = 400;  // for small screen
    }
    document.getElementById("content").style.height = (chheight+10) + 'px';
    // console.log("data_arr:", data_arr);

    $("#ch-svg").remove();

    var color = d3.scale.category20c();

    d3.select("#rel_graph")
        .attr("class", "chord_size")
        .style("width", chwidth);

    var svg = d3.select("#rel_graph").append("svg")
        .attr("id", "ch-svg")
        .attr("height",chheight)
        .attr("width",chwidth)
        .style("display", "block");

    var g = svg.append("g")
        .attr("id", "ch-g");

    // g.transition().duration(750).attr("transform", "translate(700,320)");
    g.attr("transform", "translate("+x_translate+","+y_translate+")");

    var color_dict = colorizeData();

    var ch = viz.ch().data(data_arr)
      .padding(.03)
      // .sort(sort)
      .innerRadius(inner_r).outerRadius(outer_r)
      .duration(150)
      .chordOpacity(0.3)
      .labelPadding(.03)
      .valueFormat(function(d) { return d.toFixed(2) + "%" })
      .fill(function(d){ return color_dict[d];});
      // .startAngle(-Math.PI/2);

    g.call(ch);

    var groups_init = g.selectAll(".groups")
        .on("mouseover",mouseover)
        .on("mouseout",mouseout)
        .on("click", click);

    groups_init.classed("proper", function(d){
        var this_group;
        d3.select(this).select("text").filter(function(g){ if (g.type == 'g'){this_group = g} else { this_group = "null"} });
        if (this_group !== "null") { return true; };
        });

    var groups = g.selectAll(".proper");

    var alltext = g.selectAll(".groups").select("text.label")
        .attr("type", function(d){ return d.type})
        .filter(function(d){ return d.type=="g" });

    // adjust chord labels position
    var prev_y;
    alltext.attr("dy", function(d){
        var y_pos = $(this).attr("y");
        var diff_y = Math.abs(y_pos) - y_cutoff;

        if(y_pos < -y_cutoff){ // upper hemisphere, dy more -ve .3em
            // console.log("ypos, diff_y", y_pos, diff_y, d.source);
            return "-" + (diff_y*upper_diff) + "px";
        }
        else if(y_pos > (y_cutoff+12.5)){ // lower hemisphere, dy more +ve .3em
            // console.log("ypos, diff_y", y_pos, diff_y-6.5, d.source);
            cur_diff = Math.abs(y_pos) - (y_cutoff+12.5);
            prev_y = y_pos;
            return "" + (cur_diff*lower_diff) + "px";
        }
        else{  
            return "0px";
        }
    });

    $(".loader").fadeOut("fast");   

    function colorizeData(){
        var pri_list_uniq = [], seen = new Set();
        outer:  
        for (var index = 0; index < data_arr.length; index++) {
            var value = data_arr[index][0];
            if (seen.has(value)) continue outer;
            seen.add(value);
            pri_list_uniq.push(value);
        }

        var color_dict = {};

        for (i = 0; i < pri_list_uniq.length; i++) {
            color_dict[pri_list_uniq[i]] = color(i);
        }
        return color_dict;
    }

    var stored_mouseover_ch;
    var weights_th = 0.02;
    function mouseover(d){
        if (clicked !== 1){
            console.log("Enter chord mouseover");
            ch.mouseover(d);        

            alltext.classed("text_hidden", true);
            // assign class show_text to text above weights_th
            alltext.filter(function(t){ return !(t.percent <= weights_th && t.source != d.source) })
                .classed("show_text", true).classed("text_hidden", false);
            
            var selectedBar = d3.select(this);
            // console.log("hoveredBar", selectedBar);
            selectedBar.select(".label").style('font-weight','bold')
                .style('font-size','11px');

            // set displayed percentage to be based upon target skill_group(d)
            setTimeout(function(){
                console.log("CHANGE");
                d3.selectAll(".show_text").filter(function(t){ return (t.source != d.source) })
                    .text(function(t){
                        return t.source+" ("+((t.value/d.value)*100).toFixed(2)+"%)"
                    });
            }, 20);
        }
        else{  // detailView: when target skill_group is clicked
            var target_sg;
            d3.select(".target").filter(function(t){  // .target == clicked skill-group only
                target_sg = t;
            });

            var selected_text = d3.selectAll(".show_text")
                .text(function(t){
                    if (target_sg.source != t.source){
                        return t.source +" ("+((t.value/target_sg.value)*100).toFixed(2)+"%)"
                    }
                    else{
                        return t.source + " (" + t.value.toFixed(2) + "%)" ;
                    } 
                });

            // show skill-group hidden label
            var hovered = d3.select(this).select(".label");
            if (hovered.classed("text_hidden") == true){
                hovered
                    .text(function(t){
                        return t.source +" ("+((t.value/target_sg.value)*100).toFixed(2)+"%)"
                    })
                    .classed("text_hidden", false).classed("was_hidden", true);
            }
        }
    }
    function mouseout(d){
        if (clicked !== 1){
            console.log("Enter chord mouseout");
            ch.mouseout(d);
            alltext.classed("text_hidden", false).classed("show_text",false);
            var selectedBar = d3.select(this);
            selectedBar.select(".label").style('font-weight','normal')
                .style('font-size','10px');
        }
        else{ // detailView: when target skill_group is clicked
            var target_sg;
            d3.select(".target").filter(function(t){
                target_sg = t;
            });

            // re-hide .was_hidden
            d3.select(".was_hidden").classed("text_hidden", true).classed("was_hidden", false);

            truncateTextLabel(target_sg);
        }
    }

    escapeDetailedView = function escapeDetailedView(){
        console.log("Escaped detailView");
        clicked = 0;
        stored_name = '';

        $("#skill2skill").hide();

        ch.mouseout(stored_mouseover_ch);
        alltext.classed("text_hidden", false).classed("show_text",false)
            .style('font-weight','normal')
            .style('font-size','10px');

        $('#skill_group_title').text("");
        d3.select("svg.skills_bar").transition().duration(300).attr("opacity", 0);
        
        d3.select("#skills_chart").attr("visibility", "hidden");
        $("#skills_chart").fadeOut(200);
        setTimeout(function(){
            $("#rel_graph").removeClass("ch_pos");
        }, 300);
        d3.select("#ch-g")
            .transition().duration(550).attr("transform", "translate("+x_translate+","+y_translate+")");
    }

    var clicked = 0, stored_name = '';
    function click(d){
        if (clicked === 0){
            stored_mouseover_ch = d;
            clicked = 1; 
            stored_name = d.source; 
            console.log("IF1");

            //assign class target to clicked skill_group text elm
            d3.select(this).select("text").classed("target", true);

            //draw skills bar
            $.get(DATA_URL + 'skill_analysis/skills_barchart/' + d.source, function(bar_chart_data){
                $('#skill_group_title').text(d.source);
                drawSKillsBar(d, bar_chart_data, skills_h);
            });
            //tranform chord position
            d3.select("#ch-g")
                .transition().duration(850).attr("transform", "translate("+shift_x+","+y_translate+")");
        }
        else if (clicked === 1 && stored_name === d.source){
            clicked = 0;
            stored_name = '';
            console.log("IF2");

            $("#skill2skill").hide();

            $('#skill_group_title').text("");
            d3.select("svg.skills_bar").transition().duration(300).attr("opacity", 0);
            
            d3.select("#skills_chart").attr("visibility", "hidden");
            $("#skills_chart").fadeOut(200);
            setTimeout(function(){
                $("#rel_graph").removeClass("ch_pos");
            }, 300);
            d3.select("#ch-g")
                .transition().duration(550).attr("transform", "translate("+x_translate+","+y_translate+")");
        }
        else if (clicked === 1 && stored_name !== d.source){
            stored_name = d.source;
            ch.mouseout(stored_mouseover_ch);

            alltext
                .classed("text_hidden", false).classed("show_text", false).classed("target", false)
                .style('font-weight','normal')
                .style('font-size','10px');;

            ch.mouseover(d);
           
            alltext.classed("text_hidden", true);
            alltext.filter(function(t){ return !(t.percent <= weights_th && t.source != d.source) })
                .classed("show_text", true).classed("text_hidden", false);

            var selectedBar = d3.select(this);
            selectedBar.select(".label").classed("target", true)
                .style('font-weight','bold')
                .style('font-size','11px');

            console.log("IF3");
            $("#skill2skill").hide();
            
            $.get(DATA_URL + 'skill_analysis/skills_barchart/' + d.source, function(bar_chart_data){
                $('#skill_group_title').text(d.source);
                drawSKillsBar(d, bar_chart_data, skills_h);
            });
        }
        console.log("stored_name:", stored_name);
    }

    if (search_item !== 'null'){
        var search_datum;
        var searchedGroup = groups.filter(function(s){ 
            if (s.source == search_item){ search_datum = s; } 
            return s.source == search_item
            });
        // bp.mouseover(search_datum);
        // searchedBar.select(".label").style('font-weight','bold');
        // searchedBar.select(".perc").style('font-weight','bold');

        stored_mouseover_ch = search_datum;
        clicked = 1; 
        stored_name = search_datum.source; 
        ch.mouseover(search_datum);

        alltext.classed("text_hidden", true);
        alltext.filter(function(t){ return !(t.percent <= weights_th && t.source != search_datum.source) })
            .classed("show_text", true).classed("text_hidden", false);

        //assign class target to clicked skill_group text elm
        searchedGroup.select("text").classed("target", true).style('font-weight','bold')
                .style('font-size','11px');

        //draw skills bar
        $.get(DATA_URL + 'skill_analysis/skills_barchart/' + search_datum.source, function(bar_chart_data){
            $('#skill_group_title').text(search_datum.source);
            drawSKillsBar(search_datum, bar_chart_data, skills_h);
        });
        //tranform chord position
        d3.select("#ch-g")
            .transition().duration(850).attr("transform", "translate("+shift_x+","+y_translate+")");
    }
});
} // end drawChordGraph()

//******************************************//
//                                          //
//              SKILLS BAR CHART            //
//                                          //
//******************************************//
function drawSKillsBar(target, data, skills_h){
    $.getScript("http://d3js.org/d3.v4.min.js", function() {
    //clear previous
    $("#skills_bar").html("");
    $("#skills-g").remove();

    // console.log("skills data:", data);
    //sort bars based on value
    var svg = d3.select("svg.skills_bar")
        .attr("opacity", 0)
        .style("margin-left", "auto")
        .style("margin-right", "auto");
    var margin = {top: 20, right: 20, bottom: 30, left: 180},
        width = +svg.attr("width") - margin.left - margin.right,
        height = +skills_h - margin.top - margin.bottom;
  
    var tooltip = d3.select("#skills_chart").append("div").attr("class", "toolTip");
      
    var x = d3.scaleLinear().range([0, width]);
    var y = d3.scaleBand().range([height, 0]);

    var g = svg.append("g")
        .attr("id", "skills-g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    data.sort(function(a, b) { return a.value - b.value; });

    x.domain([0, d3.max(data, function(d) { return d.value; })]);
    y.domain(data.map(function(d) { return d.name; })).padding(0.1);

    g.append("g")
        .attr("class", "y axis")
        .call(d3.axisLeft(y));
    g.selectAll("g.tick").select("text")
        .attr("font-size", "11px")
        .attr("class", "skills_chart_text");

    g.selectAll(".bar")
        .data(data)
      .enter().append("rect")
        .attr("class", "bar")
        .attr("x", 0)
        .attr("height", y.bandwidth())
        .attr("y", function(d) { return y(d.name); })
        .attr("width", function(d) { return x(d.value); })
        .on("mousemove", function(d){
            tooltip
              .style("left", d3.event.pageX -50 + "px")
              .style("top", d3.event.pageY -120 + "px")
              .style("display", "inline-block")
              .html((d.name) + "<br>" + (d.value).toFixed(3));
        })
            .on("mouseout", function(d){ tooltip.style("display", "none");});

    d3.select("#skills_chart").attr("visibility", "visible");
    d3.select("#skills_chart").style("display", "block");
    svg.attr("display", "block");
    svg.transition().duration(750).attr("opacity", 1);

    // detailView: truncate text, translate posiiton to left
    truncateTextLabel(target);

    d3.selectAll("text.skills_chart_text")
        .on("click", function(skill_name){
            d3.selectAll(".skills_chart_text").classed("selected_skill", false);
            d3.select(this).classed("selected_skill", true);
            $.get(DATA_URL + 'skill_analysis/skillsnetw/' + skill_name, function(skills_data) {
                var skills_data = JSON.parse(skills_data);
                if (skills_data.skill_name != "not_found"){
                    drawSKill2Skill(skills_data);
                }
                else{
                    alert("\"" + skill_name + "\" not found in JSON file");
                }
            });
        });
    });
}

function truncateTextLabel(target){
    d3.selectAll(".groups").select("text.label").filter(function(d){ return d.type=="g" }) // can modify to select .show_text
        .text(function(t){
            var first_sgmt = t.source.substring(0,20);
            if(target.source != t.source){
                return first_sgmt +",.. ("+((t.value/target.value)*100).toFixed(2)+"%)";
            }
            else{  // for target skill_group
                return first_sgmt + ",.. (" + t.value.toFixed(2) + "%)" ;
            }
        });

    $("#rel_graph").addClass("ch_pos");
}

//******************************************//
//                                          //
//           SKILL_2_SKILL CHART            //
//                                          //
//******************************************//
function drawSKill2Skill(data){
    $.getScript("http://d3js.org/d3.v3.min.js", function() {
    $("#skill2skill").show();

    var s_width = 800,
      s_height = 600,
      s_radius = 7,
      radius_graph = Math.min(s_width, s_height) / 2 - 10;

    var force = d3.layout.force()
      .charge(-39)
      // .linkDistance(30)
      .size([s_width, s_height]);

    $("#skill_nw").remove();

    var distanceScale = d3.scale.linear().range([15,250]);
    var min_similarity = d3.min(data.links, function(d){ return d.value; });
    var max_similarity = d3.max(data.links, function(d){ return d.value; });
    distanceScale.domain([ (1 - max_similarity), (1 - min_similarity) ]);

    var lineThicknessScale = d3.scale.linear().range([1,14]);
    lineThicknessScale.domain([ min_similarity, max_similarity ]);

    // Fix root node at svg center
    data.nodes[0].fixed = true;
    data.nodes[0].x = s_width / 2;
    data.nodes[0].y = s_height / 2;

    //Creates the graph data structure out of the json data
    force.nodes(data.nodes)
        .links(data.links)
        .linkDistance(function(d) { 
            return distanceScale(1 - d.value); });

    force.start();

    var s_svg = d3.select("#skill2skill").append("svg")  //Initially select('body')
        .attr("id", "skill_nw")
        .attr("width", s_width)
        .attr("height", s_height)
        .style("display", "block")
        .style("margin-left", "auto")
        .style("margin-right", "auto");

    s_svg.append("text").attr("x",s_width/2).attr("y",54)
        .attr("class","header_skillc")
        .style("font-weight","bold")
        // .text("\'" + data.skill_name + "\' skill cluster");
        .text("Skills relationship with respect to " + data.skill_name);

    var link = s_svg.selectAll(".link")
        .data(data.links)
        .enter().append("line")
        .attr("class", "link")
        .style("stroke-width", function(d) {
            // return Math.sqrt(1 - d.value);
            return lineThicknessScale(d.value);
        });

    var node = s_svg.selectAll(".node")
        .data(data.nodes)
        .enter().append("circle")
        .attr("class", "node")
        .attr("r", function(d){
            if (d.id == "skill_0"){ return 5 }
            return s_radius})
        .style("fill", function(d, i) {
                if (d.id == "skill_0"){
                    return "black" }  // target
                else { return "#5f89ad"}
        })
        .call(force.drag);

    var text = s_svg.selectAll("text.node_skill")
        .data(data.nodes)
        .enter().append("text")
        .attr("class", "node_skill")
        .attr("dx", 10)
        .attr("dy", ".35em")
        .attr('id', function(d) { return d.id })
        .text(function(d){ return d.name });

    force.on("tick", function() {
        link.attr("x1", function(d) {
                return d.source.x;
                })
                .attr("y1", function(d) {
                    return d.source.y;
                })
                .attr("x2", function(d) {
                    return d.target.x;
                })
                .attr("y2", function(d) {
                    return d.target.y;
                });
        text.attr("x", function(d) { return d.x; })
            .attr("y", function(d) { return d.y; });
        
        node.attr("cx", function(d) {
                // Bounded within rectangle box
                return d.x = Math.max(s_radius, Math.min(s_width - s_radius, d.x));
            })
            .attr("cy", function(d) {
                return d.y = Math.max(s_radius, Math.min(s_height - s_radius, d.y));
            });
        
    });
});
}

function initGraph(rel_type, search_item){
    // update nav active css
    $('.con_t').removeClass('active');
    $('.' + rel_type).parent().addClass('active');
    $("#rel-svg").remove();
    $("#ch-svg").remove();
    $("#skill_nw").remove();
    $("input[name=points]").removeClass();
    d3.select("#skills_chart").style("display", "none");

    var data, data_rec;

    if (rel_type === 'category' || rel_type === 'role'){
        $(".loader").show();
        $.get(DATA_URL + 'skill_analysis/bP/' + rel_type, function(data_raw) {
            // console.log("raw_data:", data_raw);
            data = data_raw.data.slice();
            // compute min/max weigvar data_rec = data.slice();htage value for slider
            data_rec = data.slice();
            // compute slider value based on data
            computeSlider(data, rel_type);
            $("input[name=points]").addClass(rel_type);
            // var content = { pri_size: data_raw.primary_size, sec_size: data_raw.secondary_size };
            // drawBpGraph(scaled_data, converttoDisplay(rel_type));
            drawBpGraph(data, converttoDisplay(rel_type), false, search_item);
        });
    }
    else if (rel_type === 'skill_group'){
        $("#th_slider").animate({ opacity: 0 }, "fast" ).css("display", "none");
        $(".loader").show();
        console.log("Enter SKill_group-Skillgroup");
        $.get(DATA_URL + 'skill_analysis/chord/', function(data_raw) {
            // console.log("chord data_raw:", data_raw);
            data = data_raw.slice();
            // compute min/max weigvar data_rec = data.slice();htage value for slider
            data_rec = data.slice();
            // compute slider value based on data
            // computeSlider(data, rel_type);  // remove if not needed
            
            drawChordGraph(data, converttoDisplay(rel_type), search_item);
        });
    }
    filterTH = function filterTH(value_th){
            $("#sliderval").text(value_th);

            //reset skill chart
            $('#skill_group_title').text("");
            d3.select("svg.skills_bar").transition().duration(300).attr("opacity", 0);
            
            d3.select("#skills_chart").attr("visibility", "hidden");
            $("#skills_chart").fadeOut(300);

            //should accept a slider value
            // console.log("slider data_rec", data_rec);
            // console.log("slider data", data);
            data.splice(0, data.length);

            for (var i = 0; i < data_rec.length; i++) {
                // if (data_rec[i][2] > 0.045) {
                if (data_rec[i][2] > value_th) {
                    data.push(data_rec[i]);
                }
            }
            // re-initiate BpGraph
            var slider_class = $("input[name=points]").attr("class");
            if (slider_class == "role" || slider_class == "category"){
                drawBpGraph(data, converttoDisplay(rel_type), true, search_item);
            }
            else {
                drawChordGraph(data, converttoDisplay(rel_type), search_item);
            }
        }
    //add other .get data from controller here.      
}

function navigateGraph(rel_type){
    window.location.href = WIN_URL + '/skill_analysis/' + rel_type;
}

function converttoDisplay(type_name){  // displaying text
  if (type_name==="category") {
    return "Job Category";
  }
  else if (type_name==="role") {
    return "Job Role";
  }
  else if (type_name==="skill_group"){
    return "Skill Group";
  }
}

function computeSlider(data, rel_type){
    var min_weight = d3.min(data, function(d){ return d[2]; }); 
        // max_weight = d3.max(data, function(d){ return d[2]; });
    var max_weight;
    if(rel_type == "role"){ max_weight = 0.06; }  //hard code max to prevent too little paths display
    else if (rel_type == "category"){ max_weight = 0.01; }
    else { max_weight = 0.025; }
    
    console.log("min_weight", min_weight);
    console.log("max_weight", max_weight);
    var step_num = 10;
    var stepsize = (max_weight - min_weight) / step_num;
    // document.getElementById("thresholdSlider").min = min_weight - stepsize.toFixed(3);
    document.getElementById("thresholdSlider").min = min_weight;
    document.getElementById("thresholdSlider").max = max_weight;
    var slider_step = document.getElementById("thresholdSlider").step = stepsize.toFixed(3);
    document.getElementById("thresholdSlider").value = min_weight;
    $("#sliderval").text(min_weight);
    $("#th_slider").css("opacity", 0).css("display", "block").animate({ opacity: 1 }, "fast" );
}