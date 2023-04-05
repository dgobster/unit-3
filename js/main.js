//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap() {

    //map frame dimensions
    var width = 960,
        height = 600;

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

        //add madison districts to map
        var madison = map
            .selectAll(".madison")
            .data(districtsMadison)
            .enter()
            .append("path")
            .attr("class", function (d) {
                return "madison " + d.properties.geo_key;
            })
            .attr("d", path);
    };
};