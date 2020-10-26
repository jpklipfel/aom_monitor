// Edit the center point and zoom level
var map = L.map('map', {
  center: [41.5, -72.7],
  zoom: 9,
  scrollWheelZoom: false
});

// Edit links to your GitHub repo and data source credit
map.attributionControl
.setPrefix('View <a href="http://github.com/jackdougherty/leaflet-map-polygon-hover">open-source code on GitHub</a>, created with <a href="http://leafletjs.com" title="A JS library for interactive maps">Leaflet</a>');
map.attributionControl.addAttribution('Population data &copy; <a href="http://census.gov/">US Census</a>');

// Basemap layer
new L.tileLayer('http://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png', {
attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>'
}).addTo(map);

// Edit to upload GeoJSON data file from your local directory
$.getJSON("ct-towns-density.geojson", function (data) {
  geoJsonLayer = L.geoJson(data, {
    style: style,
    onEachFeature: onEachFeature
  }).addTo(map);
});

// Edit ranges and colors to match your data; see http://colorbrewer.org
// Any values not listed in the ranges below displays as the last color
function getColor(d) {
  return d > 5000 ? '#800026' :
         d > 1000 ? '#BD0026' :
         d > 500  ? '#E31A1C' :
         d > 200  ? '#FC4E2A' :
         d > 100  ? '#FD8D3C' :
         d > 50   ? '#FEB24C' :
         d > 30   ? '#FED976' :
                    '#FFEDA0';
}

// Edit the getColor property to match data column header in your GeoJson file
function style(feature) {
  return {
    fillColor: getColor(feature.properties.density2010),
    weight: 1,
    opacity: 1,
    color: 'black',
    fillOpacity: 0.7
  };
}

// This highlights the layer on hover, also for mobile
function highlightFeature(e) {
  resetHighlight(e);
  var layer = e.target;
  layer.setStyle({
    weight: 4,
    color: 'black',
    fillOpacity: 0.7
  });
  info.update(layer.feature.properties);
}

// This resets the highlight after hover moves away
function resetHighlight(e) {
  geoJsonLayer.setStyle(style);
  info.update();
}

// This instructs highlight and reset functions on hover movement
function onEachFeature(feature, layer) {
  layer.on({
    mouseover: highlightFeature,
    mouseout: resetHighlight,
    click: highlightFeature
  });
}

// Creates an info box on the map
var info = L.control();
info.onAdd = function (map) {
  this._div = L.DomUtil.create('div', 'info');
  this.update();
  return this._div;
};

// Edit info box text and variables (such as props.density2010) to match those in your GeoJSON data
info.update = function (props) {
  this._div.innerHTML = '<h4>Connecticut Town<br />Population density 2010</h4>' +  (props ?
    '<b>' + props.town + '</b><br />' + props.density2010 + ' people / mi<sup>2</sup>'
    : 'Hover over a town');
};
info.addTo(map);

// Edit grades in legend to match the ranges cutoffs inserted above
// In this example, the last grade will appear as 5000+
var legend = L.control({position: 'bottomright'});
legend.onAdd = function (map) {
  var div = L.DomUtil.create('div', 'info legend'),
    grades = [0, 30, 50, 100, 200, 500, 1000, 5000],
    labels = [],
    from, to;
  for (var i = 0; i < grades.length; i++) {
    from = grades[i];
    to = grades[i + 1];
    labels.push(
      '<i style="background:' + getColor(from + 1) + '"></i> ' +
      from + (to ? '&ndash;' + to : '+'));
  }
  div.innerHTML = labels.join('<br>');
  return div;
};
legend.addTo(map);

// Use in info.update if GeoJSON data contains null values, and if so, displays "--"
function checkNull(val) {
  if (val != null || val == "NaN") {
    return comma(val);
  } else {
    return "--";
  }
}

// Use in info.update if GeoJSON data needs to be displayed as a percentage
function checkThePct(a,b) {
  if (a != null && b != null) {
    return Math.round(a/b*1000)/10 + "%";
  } else {
    return "--";
  }
}

// Use in info.update if GeoJSON data needs to be displayed with commas (such as 123,456)
function comma(val){
  while (/(\d+)(\d{3})/.test(val.toString())){
    val = val.toString().replace(/(\d+)(\d{3})/, '$1'+','+'$2');
  }
  return val;
}

//insert geojson-csv-join
var fs = require('fs');
var csv = require('csv');

// ----------------- SETTINGS
var geoJsonColumnName = 'FIPS';
var csvColumnName = 'FIPS';
var castColumnsToNumber = true;
// ------------------ END SETTINGS

csv().from.path(__dirname + '/in.csv', {
	delimiter: ',',
	escape: '"'
}).to.array(function(csvData) {
	// find index of join column
	var joinColumnIndex = csvData[0].indexOf(csvColumnName);

	// read the geojson file
	fs.readFile(__dirname + '/in.geojson', 'utf8', function(err, data) {
		if (err) {
			return console.log(err);
		}
		var geojson;
		try {
			geojson = JSON.parse(data);
		} catch (e) {
			console.log("Invalid json.", e);
		}

		var joinedData = getJoinedData(geojson, csvData, joinColumnIndex);

		// write out the joinedData
		fs.writeFile(__dirname + '/out.geojson', JSON.stringify(joinedData, null, 4), function(err) {
			if (err) {
				console.log(err);
			} else {
				console.log("GeoJSON saved to out.geojson'");
			}
		});
	});
});

// loop through all the geojson features. 
// for each geojson feature, find if it has a PROPERTY
// of the geoJsonColumnName (it better!) if so, take 
// the value of that column, and loop through the CSV
// file, searching the joinColumnIndex values for matching.
//
// if match, add all the rest of the CSV data onto the geojson
var getJoinedData = function(geojson, csvData, joinColumnIndex) {
	geojson.features.forEach(function(feature) {
		if (feature.hasOwnProperty('properties') && feature.properties.hasOwnProperty(geoJsonColumnName)) {
			var searchValue = feature.properties[geoJsonColumnName];
			if (castColumnsToNumber) {
				searchValue = parseInt(searchValue);
			}

			var additionalValuesObj = loopThroughCsv(csvData, joinColumnIndex, searchValue);
			if (additionalValuesObj !== false) {
				// add the data we got from the CSV onto the geojson properties
				for (var prop in additionalValuesObj) {
					feature.properties[prop] = additionalValuesObj[prop];
				}
			} else {
				// don't add any data and move on.
			}
		}
	}.bind(this));
	return geojson;
};

var loopThroughCsv = function(csvData, joinColumnIndex, searchValue) {
	for (var i = 1; i < csvData.length; i++) {
		var csvRow = csvData[i];
		if (csvRow[joinColumnIndex] == searchValue) {
			// found!
			return objectFromCsvHeaderAndRowNumber(csvData[0], csvData[i]);
		} else {
			// not found.
		}
	}
	return false;
};

var objectFromCsvHeaderAndRowNumber = function(headerArr, dataArr) {
	var retObj = {};
	for (var i = 0; i < headerArr.length; i++) {
		retObj[headerArr[i]] = dataArr[i];
	}
	return retObj;
};
