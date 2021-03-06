// Edit the center point and zoom level
var map = L.map('map', {
  center: [49, 6],
  zoom: 8,
  scrollWheelZoom: true
});

// Edit links to your GitHub repo and data source credit
map.attributionControl
.setPrefix('View <a href="http://github.com/jackdougherty/leaflet-map-polygon-hover">open-source code on GitHub</a>, created with <a href="http://leafletjs.com" title="A JS library for interactive maps">Leaflet</a>');
map.attributionControl.addAttribution('Population data &copy; <a href="http://census.gov/">US Census</a>');

// Basemap layer
new L.tileLayer('https://tile.thunderforest.com/transport/{z}/{x}/{y}.png?apikey=3c06693aff7242e297428b55bf38e913', {
attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://www.thunderforest.com">Maps © Thunderforest</a>'
}).addTo(map);

// Edit to upload GeoJSON data file from your local directory
$.getJSON("https://www.geograndest.fr/geoserver/region-grand-est/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=region-grand-est%3Aaomd_reseaux&maxFeatures=50&outputFormat=application%2Fjson&srsName=EPSG:4326", function (data) {
  geoJsonLayer = L.geoJson(data, {
    filter: network_filter,
    style: style,
    onEachFeature: onEachFeature
  }).addTo(map);
});

// Edit ranges and colors to match your data; see http://colorbrewer.org
// Any values not listed in the ranges below displays as the last color
function getColor(d) {
  var date = new Date();
  var date2 = new Date();
  var date3 = new Date();
  if(d !== null) {var date_fv_SIM = new Date(d.replace('Z', ''));}
    else {var date_fv_SIM = new Date(d);};
  var date1m = new Date(date2.setMonth(date2.getMonth()+1));
  var date_orig = new Date(date3.setMonth(date3.getMonth()-10));
  console.log(date1m);
  console.log(date);
  console.log(date_fv_SIM);
  console.log("next");
  return date_fv_SIM > date1m ? '#83e60b':
         date1m >= date_fv_SIM && date_fv_SIM >= date ? '#e9ce4a' :
         date_fv_SIM > date_orig && date_fv_SIM < date ? '#eb1f3e':     
      //   date_fv_SIM < date ? '#eb1f3e':
                              '#a3a79d';
}

//filtering network
function network_filter(feature) {
  if (feature.properties.nom_ao != "Conseil Régional Grand Est") return true
}

// Edit the getColor property to match data column header in your GeoJson file
function style(feature) {
  return {
    fillColor: getColor(feature.properties.fin_de_validite),
    weight: 1,
    opacity: 1,
    color: 'black',
    fillOpacity: 0.5
  };
}

// This highlights the layer on hover, also for mobile
function highlightFeature(e) {
  resetHighlight(e);
  var layer = e.target;
  layer.setStyle({
    weight: 4,
    color: 'black',
    fillOpacity: 0.5
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
  this._div.innerHTML = '<h3>Tableau de suivi réseaux de transport public du Grand Est</h3>';

  var value = props && props.date_d_integration ? props.date_d_integration + '%' : 'No data'

  this._div.innerHTML +=  (props
    ? '<b>' + props.nom_abr + '</b><br />' + 'Date import: ' + value + '</b><br />'
      + (props.fin_de_validite ? 'Fin de validité: <b>' + props.fin_de_validite : '</b>')
    : 'Hover over nations');

};
info.addTo(map);

// Edit grades in legend to match the ranges cutoffs inserted above
// In this example, the last grade will appear as 5000+
var legend = L.control({position: 'bottomright'});
legend.onAdd = function (map) {
  var div = L.DomUtil.create('div', 'info legend'),
    grades = [0, 30, 50],
    labels = ['maj offre'],
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
//legend.addTo(map);

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
