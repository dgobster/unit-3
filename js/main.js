//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap() {

    //map frame dimensions
    var width = 960,
        height = 460;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on WI
    var projection = d3.geoAlbers()
        .center([0, 43])
        .rotate([89.5, 0, 0])
        .parallels([43, 43])
        .scale(3500)
        .translate([width / 2, height / 2]);

    var path = d3.geoPath()
        .projection(projection);

    //use Promise.all to parallelize asynchronous data loading
    var promises = [
        d3.csv("data/nip_plandistrict_20.csv"),
        d3.json("data/nip_plandistrict_2020.topojson"),
    ];
    Promise.all(promises).then(callback);
};
function callback(data) {
    csvData = data[0],
        districts = data[1];

    //translate districts TopoJSON
    var madisonDistricts = topojson.feature(districts, districts.objects.nip_plandistrict_2020);

    //add Europe countries to map --> add & edit if/when add "basemap" regions
    //var countries = map.append("path")
        //.datum(europeCountries)
        //.attr("class", "countries")
        //.attr("d", path);

    //add France regions to map
    var madison = map
        .selectAll(".madison")
        .data(madisonDistricts)
        .enter()
        .append("path")
        .attr("class", function (d) {
            return "madison " + d.properties.geo_key;
        })
        .attr("d", path);
};

