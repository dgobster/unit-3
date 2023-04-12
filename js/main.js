//wrap everything is immediately invoked anonymous function so nothing is in global scope
(function () {

    //pseudo-global variables
    var attrArray = ["tot_pop_10", "fam_pov", "gds_svcs", "pc_trst", "trst_trps", "pc_ownvh"]; //list of attributes
    var expressed = attrArray[0]; //initial attribute

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
            .scale(180000)
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

        };
    }; //end of setMap()



    function joinData(districtsMadison, csvData) {

        //loop through csv to assign each set of csv attribute values to geojson region
        for (var i = 0; i < csvData.length; i++) {
            var csvRegion = csvData[i]; //the current region
            var csvKey = csvRegion.geo_key; //the CSV primary key

            //loop through geojson regions to find correct region
            for (var a = 0; a < districtsMadison.length; a++) {

                var geojsonProps = districtsMadison[a].properties; //the current region geojson properties
                var geojsonKey = geojsonProps.geo_key; //the geojson primary key

                //where primary keys match, transfer csv data to geojson properties object
                if (geojsonKey == csvKey) {

                    //assign all attributes and values
                    attrArray.forEach(function (attr) {
                        var val = parseFloat(csvRegion[attr]); //get csv attribute value
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

        //create color scale generator
        var colorScale = d3.scaleQuantile()
            .range(colorClasses);

        //build two-value array of minimum and maximum expressed attribute values
        var minmax = [
            d3.min(data, function (d) { return parseFloat(d[expressed]); }),
            d3.max(data, function (d) { return parseFloat(d[expressed]); })
        ];
        //assign two-value array as scale domain
        colorScale.domain(minmax);

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
                    return colorScale(d.properties[expressed]);
                } else {
                    return "#ccc";
                }
            });
    }

   //function to create coordinated bar chart
function setChart(csvData, colorScale){
    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 473,
        leftPadding = 25,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    //create a second svg element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    //create a rectangle for chart background fill
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);

    //create a scale to size bars proportionally to frame and for axis
    var yScale = d3.scaleLinear()
        .range([463, 0])
        .domain([0, 100]);

    //set bars for each province
    var bars = chart.selectAll(".bar")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return b[expressed]-a[expressed]
        })
        .attr("class", function(d){
            return "bar " + d.geo_key;
        })
        .attr("width", chartInnerWidth / csvData.length - 1)
        .attr("x", function(d, i){
            return i * (chartInnerWidth / csvData.length) + leftPadding;
        })
        .attr("height", function(d, i){
            return 463 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return yScale(parseFloat(d[expressed])) + topBottomPadding;
        })
        .style("fill", function(d){
            return colorScale(d[expressed]);
        });

    //create a text element for the chart title
    var chartTitle = chart.append("text")
        .attr("x", 40)
        .attr("y", 40)
        .attr("class", "chartTitle")
        .text("Number of Variable " + expressed[3] + " in each region");

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

})();