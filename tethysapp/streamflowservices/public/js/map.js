////////////////////////////////////////////////////////////////////////  MAP FUNCTIONS AND VARIABLES
function map() {
    return L.map('map', {
        zoom: 3,
        minZoom: 2,
        maxZoom: 3,
        boxZoom: true,
        maxBounds: L.latLngBounds(L.latLng(-100, -225), L.latLng(100, 225)),
        center: [20, 0],
    })
}
function basemaps() {
    return {
        "ESRI Terrain": L.layerGroup([L.esri.basemapLayer('Terrain'), L.esri.basemapLayer('TerrainLabels')]).addTo(mapObj),
        "ESRI Topographic": L.esri.basemapLayer('Topographic'),
        "ESRI Grey": L.esri.basemapLayer('Gray'),
    }
}
function showBoundaryLayers() {
    mapObj.setMaxZoom(3);
    ctrllayers = {};
    for (let i = 0; i < watersheds.length; i++) {
        ctrllayers[watersheds[i][0] + ' Boundary'] = getWatershedComponent(watersheds[i][1] + '-boundary').addTo(mapObj);
    }
    controlsObj = L.control.layers(basemapObj, ctrllayers).addTo(mapObj);
}
let legend = L.control({position: 'bottomright'});
legend.onAdd = function () {
    let div = L.DomUtil.create('div', 'legend');
    let start = '<div><svg width="20" height="20" viewPort="0 0 20 20" version="1.1" xmlns="http://www.w3.org/2000/svg">';
    div.innerHTML = '<div class="legend">' +
        start + '<polyline points="19 1, 1 6, 19 14, 1 19" stroke="blue" fill="transparent" stroke-width="2"/></svg>Drainage Line </div>' +
        start + '<polygon points="1 10, 5 3, 13 1, 19 9, 14 19, 9 13" stroke="black" fill="grey" stroke-width="2"/></svg>Watershed Boundary </div>' +
        '</div>';
    return div
};
let latlon = L.control({position: 'bottomleft'});
latlon.onAdd = function () {
    let div = L.DomUtil.create('div', 'well well-sm');
    div.innerHTML = '<div id="mouse-position" style="text-align: center"></div>';
    return div;
};
function getWatershedComponent(layername) {
    return L.tileLayer.wms(gsURL, {
        version: '1.1.0',
        layers: gsWRKSP + ':' + layername,
        useCache: true,
        crossOrigin: false,
        format: 'image/png',
        transparent: true,
        opacity: 1,
    })
}
////////////////////////////////////////////////////////////////////////  SETUP THE MAP
let mapObj = map();
let basemapObj = basemaps();
let controlsObj;
legend.addTo(mapObj);
latlon.addTo(mapObj);

let endpoint = 'http://global-streamflow-prediction.eastus.azurecontainer.io/api/';
let watersheds = JSON.parse($("#map").attr('watersheds'))['list'];

let boundary_layer;
let catchment_layer;
let drainage_layer;
let listlayers = [];
let ctrllayers = {};

showBoundaryLayers();

////////////////////////////////////////////////////////////////////////  EVENT LISTENERS
let startzoom;
let bc_threshold = 6;
let cd_threshold = 8;
mapObj.on("click", function (event) {
    if (mapObj.getZoom() >= cd_threshold) {
        $("#chart_modal").modal('show');
        askAPI('ForecastStats', event.latlng.lat, event.latlng.lng);
        // askAPI('ForecastEnsembles', event.latlng.lat, event.latlng.lng);
        askAPI('HistoricSimulation', event.latlng.lat, event.latlng.lng);
        askAPI('SeasonalAverage', event.latlng.lat, event.latlng.lng);
    }
});
mapObj.on("mousemove", function (event) {
    $("#mouse-position").html('Lat: ' + event.latlng.lat.toFixed(5) + ', Lon: ' + event.latlng.lng.toFixed(5));
});
mapObj.on('zoomstart', function (event) {
    startzoom = event.target.getZoom();
});
mapObj.on('zoomend', function (event) {
    // if you start+end over/under the max/min threshold then there is no need to change layers
    let endzoom = event.target.getZoom();
    if (startzoom >= cd_threshold && endzoom >= cd_threshold) {return}
    if (cd_threshold >= startzoom >= bc_threshold && cd_threshold >= endzoom >= bc_threshold) {return}
    if (startzoom < bc_threshold && endzoom < bc_threshold) {return}

    if (endzoom >= cd_threshold) {
        $("#map").css('cursor', 'pointer');
        mapObj.removeLayer(boundary_layer);
        mapObj.removeLayer(catchment_layer);
        drainage_layer.addTo(mapObj);
        listlayers.push(drainage_layer)
    } else if (endzoom >= bc_threshold) {
        $("#map").css('cursor', '');
        mapObj.removeLayer(boundary_layer);
        catchment_layer.addTo(mapObj);
        mapObj.removeLayer(drainage_layer);
    } else {
        $("#map").css('cursor', '');
        boundary_layer.addTo(mapObj);
        mapObj.removeLayer(catchment_layer);
        mapObj.removeLayer(drainage_layer);
    }
});
$("#watersheds_select_input").change(function () {
    let waterselect = $(this).val();
    for (let i in ctrllayers) {
        controlsObj.removeLayer(ctrllayers[i]);
        mapObj.removeLayer(ctrllayers[i]);
    }
    mapObj.removeControl(controlsObj);

    if (waterselect === '') {
        showBoundaryLayers();
        return
    }

    boundary_layer = getWatershedComponent(waterselect + '-boundary').addTo(mapObj);
    catchment_layer = getWatershedComponent(waterselect + '-catchment');
    drainage_layer = getWatershedComponent(waterselect + '-drainageline');
    ctrllayers = {
        'Watershed Boundary': boundary_layer,
        'Catchment Boundaries': catchment_layer,
        'Drainage Lines': drainage_layer,
    };
    controlsObj = L.control.layers(basemapObj, ctrllayers).addTo(mapObj);
    mapObj.setMaxZoom(12);
});

////////////////////////////////////////////////////////////////////////  GET CHART DATA BY AJAX
function titleCase(str) {
    str = str.toLowerCase().split('_');
    for (let i = 0; i < str.length; i++) {
        str[i] = str[i].charAt(0).toUpperCase() + str[i].slice(1);
    }
    return str.join(' ');
}

function askAPI(method, lat, lon) {
    console.log('started ' + method);
    let div;
    let status;
    if (method.includes('Forecast')) {
        div = $("#forecast-chart");
        status = $("#forecast-status")
    } else if (method.includes('Historic')) {
        div = $("#historic-chart");
        status = $("#historic-status")
    } else if (method.includes('Season')) {
        div = $("#daily-chart");
        status = $("#daily-status")
    }
    div.html('<img src="https://www.ashland.edu/sites/all/themes/ashlandecard/2014card/images/load.gif">');
    div.css('text-align', 'center');
    status.html(' (loading)');
    status.css('color', 'yellow');
    $.ajax({
        type: 'GET',
        async: true,
        url: '/apps/streamflowservices/query' + L.Util.getParamString({method: method, region: $("#watersheds_select_input").val(), lat: lat, lon: lon}),
        success: function (plot) {
            console.log('success ' + method);
            div.attr('class', 'charts');
            div.html(plot['data']);
            status.html(' (ready)');
            status.css('color', 'green');
        },
        error: function () {
            console.log('error ' + method);
            div.html('');
            status.html(' (failed)');
            status.css('color', 'red');
        }
    })
}