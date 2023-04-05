//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){
    //use Promise.all to parallelize asynchronous data loading
    var promises = [d3.csv("data/nip_plandistrict_20.csv"),                    
                    d3.json("data/nip_plandistrict_2020.topojson"),                    
                    ];    
    Promise.all(promises).then(callback);

    function callback(data){    
        csvData = data[0];    
        districts = data[1];    
        console.log(csvData);
        console.log(districts);
    };
};
