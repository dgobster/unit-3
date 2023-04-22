//wrap everything is immediately invoked anonymous function so nothing is in global scope
(function () {

    //pseudo-global variables
    var attrArray = ["own_occ", "white", "fam_child", "transit_stop", "over_64"]; //list of attributes
    var expressed = attrArray[0]; //initial attribute

    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 473,
        leftPadding = 25,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    //create a scale to size bars proportionally to frame and for axis
    var yScale = d3
        .scaleLinear()
        .range([463, 0])
        .domain([0, 100]);
    //begin script when window loads
    window.onload = setMap();

    //set up choropleth map
    function setMap() {

        //map frame dimensions
        var width = window.innerWidth * 0.5,
            height = 460;


        //create new svg container for the map
        var map = d3
            .select("body")
            .append("svg")
            .attr("class", "map")
            .attr("width", width)
            .attr("height", height);

        //create Albers equal area conic projection centered on WI
        var projection = d3
            .geoAlbers()
            .center([0, 43.084])
            .rotate([89.4, 0, 0])
            .parallels([43, 43])
            .scale(100000)
            .translate([width / 2, height / 2]);

        var path = d3.geoPath().projection(projection);

        //use Promise.all to parallelize asynchronous data loading
        var promises = [
            d3.csv("data/nip_plandistrict_20.csv"),
            d3.json("data/Dane_Municipal_Boundaries_2021.topojson"),
            d3.json("data/Lakes2.topojson"),
            d3.json("data/nip_plandistrict_2020.topojson"),
        ];
        Promise.all(promises).then(callback);

        function callback(data) {
            var csvData = data[0],
                county = data[1],
                lakes = data[2],
                districts = data[3];

            //translate districts, county to TopoJSON
            var countyDane = topojson.feature(county, county.objects.Dane_Municipal_Boundaries_2021),
                lakesWater = topojson.feature(lakes, lakes.objects.Lakes2),
                districtsMadison = topojson.feature(districts, districts.objects.nip_plandistrict_2020).features;

            //add Dane County to map
            var dane = map
                .append("path")
                .datum(countyDane)
                .attr("class", "dane")
                .attr("d", path);

            //add lakes to map
            var water = map
                .append("path")
                .datum(lakesWater)
                .attr("class", "water")
                .attr("d", path);

            //join csv data to GeoJSON enumeration units
            districtsMadison = joinData(districtsMadison, csvData);

            //create the color scale
            var colorScale = makeColorScale(csvData);

            //add enumeration units to the map
            setEnumerationUnits(districtsMadison, map, path, colorScale);
            //add coordinated visualization to the map
            setChart(csvData, colorScale);
            //add dropdown
            createDropdown(csvData);

        };
    }; //end of setMap()



    function joinData(districtsMadison, csvData) {

        //loop through csv to assign each set of csv attribute values to geojson region
        for (var i = 0; i < csvData.length; i++) {
            var csvMadison = csvData[i]; //the current region
            var csvKey = csvMadison.geo_key; //the CSV primary key

            //loop through geojson regions to find correct region
            for (var a = 0; a < districtsMadison.length; a++) {

                var geojsonProps = districtsMadison[a].properties; //the current region geojson properties
                var geojsonKey = geojsonProps.geo_key; //the geojson primary key

                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey) {

                    //assign all attributes and values
                    attrArray.forEach(function (attr) {
                        var val = parseFloat(csvMadison[attr]); //get csv attribute value
                        geojsonProps[attr] = val; //assign attribute and value to geojson properties
                    });
                };
            };
        };
        return districtsMadison;
    };

    //function to create color scale generator
    function makeColorScale(data) {
        var colorClasses = [
            "#D4B9DA",
            "#C994C7",
            "#DF65B0",
            "#DD1C77",
            "#980043"
        ];

        //create color scale generator
        var colorScale = d3.scaleQuantile()
            .range(colorClasses);

        //build array of all values of the expressed attribute
        var domainArray = [];
        for (var i = 0; i < data.length; i++) {
            var val = parseFloat(data[i][expressed]);
            domainArray.push(val);
        };

        //assign array of expressed values as scale domain
        colorScale.domain(domainArray);

        return colorScale;
    };


    function setEnumerationUnits(districtsMadison, map, path, colorScale) {

        //add madison districts to map
        var madison = map
            .selectAll(".madison")
            .data(districtsMadison)
            .enter()
            .append("path")
            .attr("class", function (d) {
                return "madison " + d.properties.geo_key;
            })
            .attr("d", path)
            .style("fill", function (d) {
                var value = d.properties[expressed];
                if (value) {
                    return colorScale(value);
                } else {
                    return "#ccc";
                }
            })
            .on("mouseover", function (event, d) {
                highlight(d.properties);
            })
    };

    //function to create coordinated bar chart
    function setChart(csvData, colorScale) {

        //create a second svg element to hold the bar chart
        var chart = d3
            .select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");

        //create a rectangle for chart background fill
        var chartBackground = chart
            .append("rect")
            .attr("class", "chartBackground")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);

        //set bars for each district
        var bars = chart
            .selectAll(".bar")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function (a, b) {
                return b[expressed] - a[expressed];
            })
            .attr("class", function (d) {
                return "bar " + d.geo_key;
            })
            .attr("width", chartInnerWidth / csvData.length - 1)
            .on("mouseover", function (event, d) {
                highlight(d);
            });

        //create a text element for the chart title
        var chartTitle = chart
            .append("text")
            .attr("x", 40)
            .attr("y", 40)
            .attr("class", "chartTitle");

        updateChart(bars, csvData.length, colorScale);

        //create vertical axis generator
        var yAxis = d3.axisLeft()
            .scale(yScale);

        //place axis
        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);

        //create frame for chart border
        var chartFrame = chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);
    };

    //function to create a dropdown menu for attribute selection
    function createDropdown(csvData) {
        //add select element
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function () {
                changeAttribute(this.value, csvData);
            });

        //add initial option
        var titleOption = dropdown
            .append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Attribute");

        //add attribute name options
        var attrOptions = dropdown
            .selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function (d) { 
                return d;
             })
            .text(function (d) { 
                return d;
             });
    };
    //dropdown change event handler
    function changeAttribute(attribute, csvData) {
        //change the expressed attribute
        expressed = attribute;

        //recreate the color scale
        var colorScale = makeColorScale(csvData);

        //recolor enumeration units
        var madison = d3
            .selectAll(".madison")
            .transition()
            .duration(1000)
            .style("fill", function (d) {
                var value = d.properties[expressed];
                if (value) {
                    return colorScale(value);
                } else {
                    return "#ccc";
                }
            });

        //Sort, resize, and recolor bars
        var bars = d3
            .selectAll(".bar")
            //Sort bars
            .sort(function (a, b) {
                return b[expressed] - a[expressed];
            })
            .transition() //add animation
            .delay(function (d, i) {
                return i * 20;
            })
            .duration(500);

        updateChart(bars, csvData.length, colorScale);
    }
    function updateChart(bars, n, colorScale) {
        //position bars
        bars.attr("x", function (d, i) {
            return i * (chartInnerWidth / n) + leftPadding;
        })
            //size/resize bars
            .attr("height", function (d, i) {
                return 463 - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function (d, i) {
                return yScale(parseFloat(d[expressed])) + topBottomPadding;
            })
            //color/recolor bars
            .style("fill", function (d) {
                var value = d[expressed];
                if (value) {
                    return colorScale(value);
                } else {
                    return "#ccc";
                }
            });

        //add text to chart title
        var chartTitle = d3
            .select(".chartTitle")
            .text("Percent Regional " + expressed);

    }

    //function to highlight enumeration units and bars
    function highlight(props) {
        //change stroke
        var selected = d3
            .selectAll("." + props.geo_key)
            .style("stroke", "blue")
            .style("stroke-width", "2");
    };
})();