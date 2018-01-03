var DATA_URL = '/data/';
var WIN_URL = '/';

var width = 600,
  height = 600,
  radius = 7,
  radius_graph = Math.min(width, height) / 2 - 10;

var force = d3.layout.force()
  .charge(-9)
  // .linkDistance(30)
  .size([width, height]);

var popularity_class_dict = {p1: "one", p2: "two", p3: "three", p4: "four", p5: "five"};

var graphRec, threshold, restart, detailView, escapeSkill;
// rescale popularity bar of jobtitles according to popularity score, quantize() for discrete range
var popularityScale = d3.scale.quantize().range([1,2,3,4,5]);
var min_popularity, max_popularity;

function drawGraph(jobtitle, graph) {
    $("#graph-svg").remove();
    // $("#tooltipdiv").remove();
    // hide popup div on default
    var div = d3.select(".popupctn");

    graphRec=JSON.parse(JSON.stringify(graph));

    // rescale distance of nodes according to similarity score
    var distanceScale = d3.scale.linear().range([11,250]);
    var min_similarity = d3.min(graph.links, function(d){ return d.value; });
    var max_similarity = d3.max(graph.links, function(d){ return d.value; });
    distanceScale.domain([ (1 - max_similarity), (1 - min_similarity) ]);

    // Fix root node at svg center
    graph.nodes[0].fixed = true;
    graph.nodes[0].x = width / 2;
    graph.nodes[0].y = height / 2;

    //Creates the graph data structure out of the json data
    force.nodes(graph.nodes)
        .links(graph.links)
        .linkDistance(function(d) { 
            return distanceScale(1 - d.value); })
        .start();

    graphRec2=JSON.parse(JSON.stringify(graph));

    //Append a SVG to the body of the html page. Assign this SVG as an object to svg
    var svg = d3.select("#svgcontainer").append("svg")  //Initially select('body')
        .attr("id", "graph-svg")
        .attr("width", width)
        .attr("height", height)
        ;
        // .attr("viewBox", "0 0 400 800")
        // .style("display", "block");

    // Draw circular distance grid
    var numTicks = 8,
        grid_dat = [];
    svg.selectAll('.circle-ticks').remove();

    for (i=0; i<=numTicks; i++) {
        grid_dat[i] = 10 + (((radius_graph - 70)/numTicks) * i);
    }

    var circleAxes = svg.selectAll('.circle-ticks')
        .data(grid_dat)
        .enter().append('circle')
        .attr("class", "circle-ticks")
        .attr("r", String)
        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    var focusAxis = svg.selectAll('.circle-focus')
        .data([0])
        .enter().append('circle')
        .attr("class", "circle-focus")
        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

    var diff_maxmin = max_similarity - min_similarity;

    //Create all the line svgs but without locations yet
    var link = svg.selectAll(".link")
        .data(graph.links)
        .enter().append("line")
        .attr("class", "link")
        .style("stroke-width", function(d) {
            return Math.sqrt(1 - d.value);
        });

    var clicked_node = 0;
    var stored_nodename = "";
    var skilllist_target = [];  //contains skills associated to target node; for node hover

    //Do the same with the circles for the nodes - no
    var node = svg.selectAll(".node")
        .data(graph.nodes)
        .enter().append("circle")
        .attr("class", "node node-visible")
        .attr("r", function(d){
            if (d.group == 0){ return 5 }
            return radius})
        .attr("group", function(d) { return d.group })
        .attr("nname", function(d) { return d.name })
        .attr('id', function(d) { return d.id })
        .style("fill", function(d, i) {
                if (d.group == 0){
                    d.skills.forEach(function(o){
                        skilllist_target.push(o.skill_name);
                    });
                    return "black" }  // target
                else { return "#18bd88"}
        })
        .style("cursor", "pointer")
        // .call(force.drag)  // Uncomment to enable node dragging
        .on('click', function(d){

            var this_node = d3.select(this);
            if (clicked_node == 0) {
                clicked_node = 1;
                stored_nodename = d.name;
                this_node.classed("ticked", true);
                node.style("cursor", "default");
                this_node.style("cursor", "pointer");

                $('div.scorectn[group='+d.group+']').addClass("toptitles_hl");
                
                var toppos = $('div.scorectn[group='+d.group+']').offset().top;
                // console.log("toppos", toppos);
                $('.joblists').animate({ scrollTop: toppos-150 }, 300);

                //draw related node/job skills
                drawRelSkillList(d.skills);

                // disable slider
                filterDisable();
            }
            else if (clicked_node == 1 && d.name == stored_nodename){
                clicked_node = 0;
                stored_nodename = "";
                if(this_node.classed("contains_skill") != true){
                    this_node.classed("ticked", false);
                }
                node.style("cursor", "pointer");

                var cur_fil = $("a.domfunc_filter_active").attr("id");

                if (cur_fil == "fil_all"){
                    // node.transition().duration(300).style("opacity", 1);
                }
                if (cur_fil == "fil_dom"){ not_domain_nodes.transition().duration(300).style("opacity", "0.15"); }
                if (cur_fil == "fil_func"){ not_function_nodes.transition().duration(300).style("opacity", "0.15"); }

                // highlighted jobtitle in toptitle list
                $('div.scorectn').removeClass("toptitles_hl");
                // re-enable dom/func filters
                
                if (clicked_scloud != 1){
                    skill_selection = drawSkillList(skill_data_aggr); 
                    enableHoverSkills(skill_selection); 
                    filterEnable();
                }
            }
        });

    // job labels
    // var text = svg.selectAll("text.jlabel")
    //     .data(graph.nodes)
    //     .enter().append("text")
    //     .attr("dx", 10)
    //     .attr("dy", ".35em")
    //     .attr("class", "jlabel")
    //     .text(function(d) { return d.name })
    //     .style("stroke", "gray");

    var cur_node;
    node.on('mouseover', function(d){
        mouseoverNode(d);
    })
    .on('mouseout', function(d){
        mouseoutNode();
    });

    function mouseoverNode(node_datum){
        if (clicked_node != 1){
            cur_node = node.filter(function(n){
                return n.id == node_datum.id;
            });
            if(!cur_node.classed("ticked")){  //maybe se selectall circle filter return id==..
                // highlight mouseovered node with thick border, disabled in detailView
                cur_node.classed("node-active", true)
                    .transition().duration(200).attr("r", radius+3);
                $('div.scorectn[group='+node_datum.group+']').addClass("toptitles_hl");
            }

            var curnode = $('.node[id='+node_datum.id+']').offset();

            // div tooltip
            div.style("visibility", "visible");
            if ($(window).height() > 700){
                div.style("left", node_datum.x + 210 + "px")     
                .style("top", node_datum.y + 23 + "px");
            }
            else{
                div.style("left", node_datum.x - 10 + "px")     
                .style("top", node_datum.y + 13 + "px");
            }

            $("#rel_t_name").text(node_datum.name);
            if (node_datum.name == jobtitle){
                $("#rel_t_weight").text("center");

                var popularity_count = "p" + popularityScale(node_datum.popularity);
                var pop = popularity_class_dict[popularity_count];
                // console.log("center", node_datum.popularity, pop);
                $("#rel_t_poprt").attr("class", "score2 "+pop);
            }
            else{
                $("#rel_t_weight").text(node_datum.similarity);
            }
            
            $("#rel_t_poprt").attr("class", $('div.score2[group='+node_datum.group+']').attr("class"));
            $("#rel_t_dom").text(node_datum.domain);
            $("#rel_t_func").text(node_datum.function);
            // $("#rel_t_explore").attr("href", 'javascript:updateGraph(\''+node_datum.name+'\')');
            $("#rel_t_explore").attr("href", 'javascript:exploreJobs(\''+node_datum.name+'\')');
            $("#close").attr("href", 'javascript:detailView(\''+node_datum.name+'\')');

            // black focused radial guide
            d_x = Math.pow(Math.abs(300 - node_datum.x), 2);
            d_y = Math.pow(Math.abs(300 - node_datum.y), 2);
            focusAxis.style("visibility", "visible")
                .attr("r", Math.sqrt(d_x + d_y));

            // grey radial axes
            circleAxes.style("opacity", 0);

            if (clicked_scloud != 1){
                recolorSkills(node_datum);
            }
        }
    }

    function mouseoutNode(){
        if (clicked_node != 1){
            if(!cur_node.classed("ticked")){  // only disable highlight/border when !.ticked
                cur_node.classed("node-active", false)
                .transition().duration(200).attr("r", radius);
                $('div.scorectn').removeClass("toptitles_hl");
            }

            div.style("visibility", "hidden");
            focusAxis.style("visibility", "hidden");
            circleAxes.style("opacity", 0.5);
            
            if (clicked_scloud != 1){
                $("#rel_t_name_lg").text("..");
                $(".skillcloud").removeClass("shared");
                // recolor, show skill cloud to original/visible
                // d3.selectAll('text.skillcloud')
                d3.selectAll('div.skill2')
                    // .style("cursor", "pointer")
                    .style("visibility", "visible")
                    // .transition().duration(200).style("fill", function(d, i) { return fill(i); });
                    // .transition().duration(200).style("fill", function(d, i) { return "black"; });
                    // .transition().duration(200).style("border", "2px solid white" );
                 .classed("skillcloud_hl", false);
            }
        }
    }

    function recolorSkills(node_datum){
        var cur_node_skilllist = [];
        node_datum.skills.forEach(function(o){
            cur_node_skilllist.push(o.skill_name);
        });

        d3.selectAll('div.skill2')//.style("fill", "white" ) // Reset color at first
            // .style("cursor", "default")
            // Check and recolor based on skills of mouseover-ed node
            .filter(function(d, i) { 
                this_text = $(this).attr("name"); // for new div score2
                var isinTarget = $.inArray(this_text, skilllist_target) >= 0;
                var isinCurnode = $.inArray(this_text, cur_node_skilllist) >= 0;
                // return (isinTarget && isinCurnode);
                return isinCurnode;
            }).classed("skillcloud_hl", true);
    }

    //Now we are giving the SVGs co-ordinates -
    //the force layout is generating the co-ordinates which this code is using to update the attributes of the SVG elements
    force.on("tick", function() {        
        node.attr("cx", function(d) {
                // Bounded within rectangle box
                return d.x = Math.max(radius, Math.min(width - radius, d.x));
            })
            .attr("cy", function(d) {
                return d.y = Math.max(radius, Math.min(height - radius, d.y));
            });
        // job labels
        // text.attr("x", function (d) {
        //     return d.x;
        // })
        //     .attr("y", function (d) {
        //     return d.y;
        // });
    });

    //adjust slider threshold
    threshold = function setThreshold(value_th) {
        $("#sliderval").text(value_th);
        graph.links.splice(0, graph.links.length);  // Remove graph.links.data()
        
        // hide all at first
        node_noroot.classed("node-hidden", true).classed("node-visible", false);
        // clear all dvToptitles
        $('#dvToptitles').css("opacity", 0 ).html('');

        for (var i = 0; i < graphRec.links.length; i++) {
            if (graphRec.links[i].value > value_th) {
                graph.links.push(graphRec.links[i]);
                
                // Configure other nodes hidden
                var cur_link = graphRec2.links[i];
                var cur_id = cur_link.target.id;

                // var all_nodes = svg.selectAll(".node");
                var selected_node = node.filter(function (d, i) {
                    return d.id == cur_id;
                });

                var popularity_count = "p" + popularityScale(cur_link.target.popularity);
                var pop = popularity_class_dict[popularity_count];
                titleStr = '' + cur_link.target.popularity + ' out of ' + max_popularity + ' (max of all Related Job Titles)';
                // linkStr = '<a id="' +cur_id+ '" class="toptitles" href="javascript:detailView(\'' +cur_link.target.name + '\')">';
                linkStr = '<a id="' +cur_id+ '" class="toptitles" pop="'+cur_link.target.popularity+'" sim="'+cur_link.target.similarity+'" href="javascript:detailView(\'' +cur_link.target.name + '\')">';
                linkStr += '<div group="' + cur_link.target.group+ '" class="scorectn"><div class="col_popularity"><div group="' + cur_link.target.group+ '" class="score2 '+pop+'"' +
                ' title="' + titleStr+'"></div></div><div class="score2txt">'+ cur_link.target.name +'</div></div>' + '</a>';

                $('#dvToptitles').append(linkStr);

                selected_node.classed("node-hidden", false).classed("node-visible", true);
            }
        }
        $('#dvToptitles').animate({ opacity: 1 }, "fast" )

        a_elmt_toptitles = $('a[class="toptitles"]');
        // pass jquery selection to function:enableHover(selection) for hover ability
        enableHover(a_elmt_toptitles);
        restart();
    }
    
    //Restart the visualisation after any node and link changes
    restart = function restartVis() {
        link = link.data(graph.links);
        link.exit().remove();
        link.enter().insert("line", ".node").attr("class", "link");
        node = node.data(graph.nodes);
        node.enter().insert("circle", ".cursor").attr("class", "node").attr("r", 5)/* .call(force.drag) */;
        force.start();

        // Update # of domain & function
        domain_count = 0, function_count = 0;
        // list that contains current node indexes
        var nodes_visible = [];
        var displayed_titles = [];
        graph.links.forEach(function (d) {
            nodes_visible.push(d.target.index);
            displayed_titles.push(d.target.name);
        });
        var displayed_nodes = node_noroot.filter(function(d){
            return $.inArray(d.index, nodes_visible) >= 0;
        });

        updateFilterCount(displayed_nodes);
        updateSkillList(displayed_titles);
    }

    function updateSkillList(displayed_titles){
        // console.log("displayed_titles", displayed_titles);
        $("#loader_skill").fadeIn("fast");
        $.get(DATA_URL + 'job/get_selected_skill/', {job_num: graph.links.length, job: jobtitle}, function(updated_skill_data) {
            // console.log("updated_data", updated_data);
            // redraw skill list
            skill_data_aggr = updated_skill_data;

            skill_selection = drawSkillList(updated_skill_data); 
            enableHoverSkills(skill_selection); 

            $("#loader_skill").fadeOut("fast");
            // console.log("Skills section updated");
        });
    }

    function updateFilterCount(displayed_nodes){
        not_domain_nodes = displayed_nodes.filter(function(d){ return d.domain != graph.domain; });
        not_function_nodes = displayed_nodes.filter(function(d){ return d.function != graph.function; });
        not_others_nodes = displayed_nodes.filter(function(d){
            if (d.function != graph.function && d.domain != graph.domain){
                return false;
            };
            return true;
        });
        var domain_count = (displayed_nodes[0].length - not_domain_nodes[0].length);
        var function_count = (displayed_nodes[0].length - not_function_nodes[0].length);
        var others_count = (displayed_nodes[0].length) - domain_count - function_count;
        others_count = others_count < 0 ? 0 : others_count;
        // Update number of nodes connected to target (# Similar job titles:)
        $("#nodenum").css("opacity", 0 ).text(graph.links.length).animate({ opacity: 1 }, "fast" );
        $('#dom_fil').css("opacity", 0 ).text(domain_count).animate({ opacity: 1 }, "fast" );
        $('#func_fil').css("opacity", 0 ).text(function_count).animate({ opacity: 1 }, "fast" );
        // $('#others_fil').text(others_count);  // temp not used //
        filterClick(stored_filter);
    }
    
    // $("a.fil").removeClass("domfunc_filter_active")  // .domfunc_filter_active for green selected filter
    $("a.fil").removeClass("inactive");
    // Render initial dom&func count
    var not_domain_nodes, not_function_nodes, not_others_nodes;
    var stored_filter = 'all';

    filterClick = function filterClick(filter_by){
        if (clicked_node != 1){
            $(".dblink").removeClass("active");
            $("a.fil").removeClass("domfunc_filter_active");
            $('a[class=fil][id=fil_'+filter_by+']').addClass("domfunc_filter_active").parent().parent().addClass("active");
            // all
            node.style("opacity", 1);
            if (filter_by != 'all'){
                if (filter_by == 'dom'){ stored_filter = 'dom'; not_domain_nodes.style("opacity", "0.15"); }
                if (filter_by == 'func') { stored_filter = 'func'; not_function_nodes.style("opacity", "0.15"); }
                // if (value == "others"){ not_others_nodes.style("opacity", "0.15"); }
            }
            else{
                stored_filter = 'all';
            }
        }
    }

    function drawMainTopTitles(){
        //Empty dvToptitles div
        $('#dvToptitles').html('');
        //Loop through each titlename and add a link
        // start from 1 to ignore root===same title
        for (i = 1; i < graphRec.nodes.length; i++) {
            var popularity_count = "p" + popularityScale(graphRec.nodes[i].popularity);
            var pop = popularity_class_dict[popularity_count];
            // console.log("pop", graphRec.nodes[i].name, pop);

            titleStr = '' + graphRec.nodes[i].popularity + ' out of ' + max_popularity + ' (max of all Related Job Titles)';

            linkStr = '<a id="' +graphRec.nodes[i].id+ '" class="toptitles" pop="'+graphRec.nodes[i].popularity+'" sim="'+graphRec.nodes[i].similarity+'" href="javascript:detailView(\'' +graphRec.nodes[i].name + '\')">';
            linkStr += '<div group="' +graphRec.nodes[i].group+ '" class="scorectn"><div class="col_popularity"><div group="' +graphRec.nodes[i].group+ '" class="score2 '+pop+'"' +
            ' title="' + titleStr+'"></div></div><div class="score2txt">'+graphRec.nodes[i].name +'</div></div>' + '</a>';
            $('#dvToptitles').append(linkStr);
        }

        // d3.selectAll(".score2").attr("title", function(){
        //  return 
        // });
       
        a_elm = $('#dvToptitles > a');
        return a_elm;
    }

    // used by toptitle href, popup div exit href
    detailView = function showDetailView(title_name){
        var select_nodes = svg.selectAll('.node');
        var corespd_node;
        var selected = select_nodes.filter(function(d) {
            if (d.name == title_name){ corespd_node = d;}
            return (d.name == title_name);
        });

        if (clicked_node == 0) {        
            selected.classed("node-active", true);        
            stored_nodename = title_name;
            selected.classed("ticked", true);
            node.style("cursor", "default");
            selected.style("cursor", "pointer");
            mouseoverNode(corespd_node);
            clicked_node = 1;
            
            // update jobtitles in toptitle list
            $('div.scorectn[group='+corespd_node.group+']').addClass("toptitles_hl");
            //draw related node/job skills
            drawRelSkillList(corespd_node.skills);

            // disable dom/func/slider filters
            filterDisable();
        }
        else if (clicked_node == 1 && title_name == stored_nodename){
            clicked_node = 0;
            console.log("enter if 2");
            stored_nodename = "";
            
            node.style("cursor", "pointer");
            if(selected.classed("contains_skill") != true){
                selected.classed("ticked", false);
                selected.classed("node-active", false);
            }

            var cur_fil = $("a.domfunc_filter_active").attr("id");

            if (cur_fil == "fil_all"){
                // node.transition().duration(300).style("opacity", 1);
            }
            if (cur_fil == "fil_dom"){ not_domain_nodes.transition().duration(300).style("opacity", "0.15"); }
            if (cur_fil == "fil_func"){ not_function_nodes.transition().duration(300).style("opacity", "0.15"); }

            mouseoutNode();
            $('div.scorectn').removeClass("toptitles_hl");

            if (clicked_scloud != 1){
                skill_selection = drawSkillList(skill_data_aggr); 
                enableHoverSkills(skill_selection);
                filterEnable();
            }
        }
    }
    
    function enableHover(hyperlink_content){
        hyperlink_content.hover(
        // mouseover
            function(){
                if (clicked_node != 1){
                    id = $(this).attr('id');
                    var mouseover_node;
                    // var the_rest_nodes = node_noroot.filter(function (d, i) {
                    var the_rest_nodes = node.filter(function (d, i) {
                        if (d.id == id){ mouseover_node = d;}
                        return d.id != id;
                    });
                    mouseoverNode(mouseover_node);
                }
            },
            // mouseout
            function(){
                // Only visible when detailView not executed
                if (clicked_node != 1){
                    var cur_fil = $("a.domfunc_filter_active").attr("id");

                    if (cur_fil == "fil_all"){
                        // node.transition().duration(300).style("opacity", 1);
                    }
                    if (cur_fil == "fil_dom"){ not_domain_nodes.transition().duration(300).style("opacity", "0.15"); }
                    if (cur_fil == "fil_func"){ not_function_nodes.transition().duration(300).style("opacity", "0.15"); }

                    mouseoutNode();
                }
            }
        );
    }

    //For related job title skills on node click
    function drawRelSkillList(rel_skills){
        if (clicked_scloud != 1){
            $("#sectiontitle_label").css("height", "9%");
            $(".sectiontitle").addClass("shrink_label");
            $("#dvSkills").css("height", "88%");
            $("#title_in_skillbar").text($("#rel_t_name").text());
            $('#title_in_skillbar_CNTR').css("opacity", 0).css("display", "block").animate({ opacity: 1 }, "fast" );
            $('#dvSkills').css("opacity", 0).html('');
            // for (i = 0; i < rel_skills.length-10; i++) {
            for (i = 0; i < rel_skills.length; i++) {
                linkStr = '<a class="skillcloud" name="' +rel_skills[i].skill_name+ '" href="javascript:clickSkill(\'' +rel_skills[i].skill_name + '\')">';
                linkStr += '<div name="' +rel_skills[i].skill_name+ '" class="skill2">'+rel_skills[i].skill_name+'</div>' + '</a>';
                $('#dvSkills').append(linkStr);
            }

            // $("a.skillcloud").css("cursor", "default");
            $("a.skillcloud").addClass("disable_pointer");
            // $('.skill2').addClass("skillcloud_hl");
            $('.skill2').addClass("skill_rel_hl");
            $('#dvSkills').animate({ opacity: 1 }, "fast" );
        }
    }

    function drawSkillList(skill_data){
        // console.log("skill data", skill_data);
        //Empty div
        $('div.skill2').removeClass("skillcloud_hl");
        $('div.skill2').removeClass("skill_rel_hl");
        $('#title_in_skillbar_CNTR').animate({ opacity: 0 }, "fast" ).css("display", "none");
        $("#sectiontitle_label").css("height", "5%");
        $(".sectiontitle").removeClass("shrink_label");
        $("#dvSkills").css("height", "95%");
        $('#dvSkills').css("opacity", 0).html('');
        for (i = 0; i < skill_data.length; i++) {
            linkStr = '<a class="skillcloud" name="' +skill_data[i].name+ '" href="javascript:clickSkill(\'' +skill_data[i].name + '\')">';
            linkStr += '<div name="' +skill_data[i].name+ '" class="skill2">'+skill_data[i].name+'</div>' + '</a>';
            $('#dvSkills').append(linkStr);
        }
        $("#dvSkills").animate({ opacity: 1 }, "fast" );

        div_esc = d3.select("#dvSkills").append("div")
                .attr("class", "skill_exit")
                .style("visibility", "hidden")
                .style("display", "inline-block")
                .style("position", "absolute");

        skills_elm = $('#dvSkills > a');
        return skills_elm;
    }

    var stored_skillname; 
    var clicked_scloud = 0;
    var skill_data_aggr;

    function enableHoverSkills(skill_selection){
        var containing_nodes;
        skill_selection.hover(
            // mouseover
            function(){
                name = $(this).attr('name');
                mouseoverSkill(name);
            },
            // mouseout
            function(){
                mouseoutSkill();
            }
        );

        function mouseoverSkill(skill_name){
            if (clicked_scloud != 1  && clicked_node != 1){
                $('.skill2[name=\''+skill_name+'\']').addClass("skill_mouseover");

                // update label
                $("#sectiontitle_label_tt").css("height", "12%");
                $("#dvToptitles_container").css("height", "88%");
                // update toptile_list label, add..
                $('#skill_in_toptitles_CNTR').css("opacity", 0).css("display", "block").animate({ opacity: 1 }, "fast" );
                $("#skill_in_toptitles").html('');
                $("#skill_in_toptitles").append(
                    $('.skill2[name=\''+skill_name+'\']').clone().addClass("clone").attr("name", "clone"));
                // update toptitle list
                $('#dvToptitles').css("opacity", 0 ).html('');
                $(".toptitle_skill").css("color", "black");

                var rel_count = 0;  //if want to display number of jobs containing hovered skill
                containing_nodes = d3.selectAll('.node-visible').filter(function (o, i) {  //include center target node
                    //store skills for each node
                    var node_skillkeys = [];
                    o.skills.forEach(function(d){
                        node_skillkeys.push(d.skill_name);
                    });
                    if ($.inArray(skill_name, node_skillkeys) >= 0){
                        // calculate popularity
                        var popularity_count = "p" + popularityScale(o.popularity);
                        var pop = popularity_class_dict[popularity_count];
                        // modify toptitle list
                        titleStr = '' + o.popularity + ' out of ' + max_popularity + ' (max of all Related Job Titles)';
                        // linkStr = '<a id="' +o.id+ '" class="toptitles" href="javascript:detailView(\'' +o.name + '\')">';
                        linkStr = '<a id="' +o.id+ '" class="toptitles" pop="'+o.popularity+'" sim="'+o.similarity+'" href="javascript:detailView(\'' +o.name + '\')">';
                       if (o.group != 0){
                            linkStr += '<div group="' +o.group+ '" class="scorectn"><div class="col_popularity"><div group="' +o.group+ '" class="score2 '+pop+'" title="'+titleStr+'"></div></div><div class="score2txt">'+o.name +'</div></div>' + '</a>';
                        }
                        else{
                            linkStr += '<div group="' +o.group+ '" class="scorectn"><div class="col_popularity"><div group="' +o.group+ '" class="score2 '+pop+'" title="'+titleStr+'"></div></div><div class="score2txt">'+o.name +'(center)</div></div>' + '</a>';
                        }

                        $('#dvToptitles').append(linkStr);
                        rel_count += 1;
                        return true;
                    }
                    else{
                        return $.inArray(skill_name, node_skillkeys) >= 0;  //false
                    }
                });
                $('#dvToptitles').animate({ opacity: 1 }, "fast" );

                containing_nodes.classed("node-active", true);
                containing_nodes.style("fill", "#d1ec9c");  //$(this) == skill text

                // enable hover
                a_elmt_toptitles = $('a[class="toptitles"]');
                enableHover(a_elmt_toptitles);
                sortToptitles();
            }
        }
        function mouseoutSkill(){
            if (clicked_scloud != 1 && clicked_node != 1){
                $('div.skill2').removeClass("skill_mouseover");

                $('#dvToptitles').css("opacity", 0 ).html('');
                    
                containing_nodes.classed("node-active", false);
                containing_nodes.style("fill", function(d){
                    if (d.group == 0) { return "black" }
                    return "#18bd88";
                });

                // recover toptitle list according to .node.node-visible
                d3.selectAll(".node-visible").filter(function(o){
                    var popularity_count = "p" + popularityScale(o.popularity);
                    var pop = popularity_class_dict[popularity_count];

                    if (o.group != 0){  // exclude target center node
                        titleStr = '' + o.popularity + ' out of ' + max_popularity + ' (max of all Related Job Titles)';
                        // linkStr = '<a id="' +o.id+ '" class="toptitles" href="javascript:detailView(\'' +o.name + '\')">';
                        linkStr = '<a id="' +o.id+ '" class="toptitles" pop="'+o.popularity+'" sim="'+o.similarity+'" href="javascript:detailView(\'' +o.name + '\')">';
                        linkStr += '<div group="' +o.group+ '" class="scorectn"><div class="col_popularity"><div group="' +o.group+ '" class="score2 '+pop+'" title="'+titleStr+'"></div></div><div class="score2txt">'+o.name +'</div></div>' + '</a>';
                        $('#dvToptitles').append(linkStr);
                    }
                    return true; //doesnt matter
                });

                $('#dvToptitles').animate({ opacity: 1 }, "fast" )

                // recover toptile_list label
                $('#skill_in_toptitles_CNTR').css("opacity", 0).css("display", "none");
                $("#sectiontitle_label_tt").css("height", "7%");
                $("#dvToptitles_container").css("height", "93%");

                // enable hover
                a_elmt_toptitles = $('a[class="toptitles"]');
                enableHover(a_elmt_toptitles);
                sortToptitles();
            }
        }

        clickSkill = function clickSkill(name){
            skill_color = '#18bd88';
            // condition to turn ON/OFF active ADD HERE
            if (clicked_scloud == 0 && clicked_node != 1) {
                // $("a.skillcloud").css("cursor", "default");
                $("a.skillcloud").addClass("disable_pointer");
                // $('.skillcloud[name=\''+name+'\']').css("cursor", "pointer");

                clicked_scloud = 1;
                stored_skillname = name;
                // console.log("stored_skillname:", stored_skillname);

                containing_nodes.classed("ticked contains_skill", true);
                // append an escape icon
                div_esc.style("visibility", "visible");

                var OFFSet = $('.skill2[name=\''+name+'\']').offset();
                
                // console.log("selected_skill", selected_skill);
                div_esc.html( '<a id="close_skill" title="Uncheck skill" href="javascript:escapeSkill(\'' +name + '\')"><i class="material-icons">close</i></a>');
                $(".skill_exit").insertAfter('.skill2[name=\''+name+'\']');

                // disable dom/func/ slider filters
                filterDisable();

            }
            else if (clicked_scloud == 1 && name == stored_skillname && clicked_node != 1){
                $("a.skillcloud").removeClass("disable_pointer");
                clicked_scloud = 0;
                stored_skillname = "";
                // console.log("stored_skillname", stored_skillname);

                containing_nodes.classed("ticked contains_skill", false);
                div_esc.style("visibility", "hidden");

                filterEnable();
            }  
        } //end clickSkill()

        escapeSkill = function escapeClickedSkill(skill_name){
            $("a.skillcloud").removeClass("disable_pointer");
            clicked_scloud = 0;
            stored_skillname = "";
            containing_nodes.classed("ticked contains_skill", false);

            mouseoutSkill(skill_name);
            div_esc.style("visibility", "hidden");

            filterEnable();
        }
    } //end enableHoverSkills()

    function filterDisable(){
        document.getElementById("thresholdSlider").disabled = true;
        $('#thresholdSlider').css("opacity", "0.4").css("cursor", "not-allowed");
        $(".dblink").addClass("disabled");
        $( "a.fil" ).addClass("inactive");
    }
    function filterEnable(){
        document.getElementById("thresholdSlider").disabled = false;
        $('#thresholdSlider').css("opacity", "1").css("cursor", "pointer");
        $(".dblink").removeClass("disabled");
        $("a.fil").removeClass("inactive");
    }

    var div_esc;
    function getSkillList(){
        // Get skill data from controller for job title
        $.get(DATA_URL + 'job/get_all_skill/' + jobtitle, function(skill_data) {
            // console.log("skill_data", skill_data);
            skill_data_aggr = skill_data;

            skill_selection = drawSkillList(skill_data); 
            enableHoverSkills(skill_selection); 

            console.log("Skills section loaded");
            $(".loader").fadeOut("fast");   

        });  // end d3.csv(skillcloud)
    }  // end getSkillList()

    // sort Toptitle list based on 'sort_by' selection
    function sortToptitles(){
        if($("#sort_rel_t").val() == 'similarity'){
            $("#dvToptitles").find('.toptitles').sort(function (a, b) {
                // console.log(1, $(a).attr("sim"));
                return $(b).attr("sim") - $(a).attr("sim");
            })
            .appendTo( $("#dvToptitles") );
        }
        else if ($("#sort_rel_t").val() == 'popularity'){
            $("#dvToptitles").find('.toptitles').sort(function (a, b) {
                // console.log(1, $(a).attr("sim"));
                return $(b).attr("pop") - $(a).attr("pop");
            })
            .appendTo( $("#dvToptitles") );
        }
    }  // end sortToptitles()

    
    $(function() {
        // filter div container click
        $(".dblink").click(function(){
            if (clicked_scloud == 0 && clicked_node != 1) {
                if ($(this).hasClass("dom")){ filterClick("dom") }
                else if ($(this).hasClass("func")){ filterClick("func") }
                else if ($(this).hasClass("all")){ filterClick("all") }
            }
        });

        $("#sort_rel_t").change(function(){
            // console.log("sort", $(this).val());
            // if($(this).val() == 'similarity'){
            //     $("#dvToptitles").find('.toptitles').sort(function (a, b) {
            //         // console.log(1, $(a).attr("sim"));
            //         return $(b).attr("sim") - $(a).attr("sim");
            //     })
            //     .appendTo( $("#dvToptitles") );
            // }
            // else if ($(this).val() == 'popularity'){
            //     $("#dvToptitles").find('.toptitles').sort(function (a, b) {
            //         // console.log(1, $(a).attr("sim"));
            //         return $(b).attr("pop") - $(a).attr("pop");
            //     })
            //     .appendTo( $("#dvToptitles") );
            // }
            sortToptitles();
        });
    }); // end function()

    //first time load
    // Slider 
    var node_noroot = node.filter(function (d) {
        return d.group != 0;
    });

    // set slider initial values
    var step_num = 20;
    var stepsize = diff_maxmin / step_num;
    var slider_min = document.getElementById("thresholdSlider").min = min_similarity - 0.003; 
    var slider_max = document.getElementById("thresholdSlider").max = max_similarity;
    var slider_step = document.getElementById("thresholdSlider").step = stepsize.toFixed(3);
    var slider_val = document.getElementById("thresholdSlider").value = min_similarity;
    document.getElementById("thresholdSlider").disabled = false;
    $("#sliderval").text(min_similarity);  
    $('#thresholdSlider').css("opacity", "1");

    // set all/dom/func count
    updateFilterCount(node_noroot);
    // 
    a_elmt_toptitles = drawMainTopTitles();
    enableHover(a_elmt_toptitles);

    getSkillList();
    
}  // end drawGraph

// Main job title panel content
// function renderMainTitleContent(main_title_name, main_data, skill_data){
function renderMainTitleContent(main_data){
        $("#mainjob_title").text(main_data.name);

        min_popularity = d3.min(main_data.nodes, function(d){ return d.popularity; });
        max_popularity = d3.max(main_data.nodes, function(d){ return d.popularity; });
        // console.log("min: ", min_popularity, ",max_popularity :", max_popularity);
        popularityScale.domain([min_popularity, max_popularity]);

        var popularity_count = "p" + popularityScale(main_data.popularity);
        var pop = popularity_class_dict[popularity_count];
        // console.log("mainTitleBar POPULARITY COUNT:", popularity_count, ", SCALED: ",  pop );
        $("#mainjob_poprt").attr("class", "score2 "+pop);
        $("#mainjob_dom").text(main_data.domain);
        $("#mainjob_func").text(main_data.function);
        $("#mainjob_title_lg").text(main_data.name);
}

// For main job title graph / navigate
var updateGraph = function updateGraph(jobtitle){
    $(".loader").show();
    $("#mainjob_title_loader").text(jobtitle);
    $.get(DATA_URL + 'job/' + jobtitle, {}, function(data) {
        var jobJsData = JSON.parse(data);
        // console.log("jobJsData", jobJsData);
        // Render maintitle content: Dom, Func, Skills; EXCEPTION: Toptitles(href)
        renderMainTitleContent(jobJsData);
        drawGraph(jobtitle, jobJsData);
    });

    //add other .get data from controller here.      
}

var exploreJobs = function exploreJobs(jobtitle){
    window.location.href = WIN_URL + 'job/' + jobtitle;
}