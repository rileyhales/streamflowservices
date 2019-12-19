////////////////////////////////////////////////////////////////////////  WEB MAPPING FEATURE SERVICE EXTENSION
L.TileLayer.WMFS = L.TileLayer.WMS.extend({
    GetFeatureInfo: function (evt) {
        // Construct a GetFeatureInfo request URL given a point
        let size = this._map.getSize();
        let params = {
            request: 'GetFeatureInfo',
            service: 'WMS',
            srs: 'EPSG:4326',
            version: this.wmsParams.version,
            format: this.wmsParams.format,
            bbox: this._map.getBounds().toBBoxString(),
            height: size.y,
            width: size.x,
            layers: this.wmsParams.layers,
            query_layers: this.wmsParams.layers,
            info_format: 'application/json',
            buffer: 18,
        };
        params[params.version === '1.3.0' ? 'i' : 'x'] = evt.containerPoint.x;
        params[params.version === '1.3.0' ? 'j' : 'y'] = evt.containerPoint.y;

        let url = this._url + L.Util.getParamString(params, this._url, true);
        // console.log(url);
        let reachid = null;

        if (url) {
            $.ajax({
                async: false,
                type: "GET",
                url: url,
                info_format: 'application/json',
                success: function (data) {
                    reachid = data.features[0].properties['COMID'];
                    console.log(reachid);
                }
            });
        }
        return reachid
    },
});

L.tileLayer.WMFS = function (url, options) {
    return new L.TileLayer.WMFS(url, options);
};


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
        "ESRI Topographic": L.esri.basemapLayer('Topographic').addTo(mapObj),
        "ESRI Terrain": L.layerGroup([L.esri.basemapLayer('Terrain'), L.esri.basemapLayer('TerrainLabels')]),
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
function getDrainageLine(layername) {
    return L.tileLayer.WMFS(gsURL, {
        version: '1.1.0',
        layers: gsWRKSP + ':' + layername,
        useCache: true,
        crossOrigin: false,
        format: 'image/png',
        transparent: true,
        opacity: 1,
    })
}
let reachid;
let needsRefresh = {};

let watersheds = JSON.parse($("#map").attr('watersheds'))['list'];
let listlayers = [];
let ctrllayers = {};
let boundary_layer;
let catchment_layer;
let drainage_layer;
let marker = null;
////////////////////////////////////////////////////////////////////////  SETUP THE MAP
let mapObj = map();
let basemapObj = basemaps();
let controlsObj;
legend.addTo(mapObj);
latlon.addTo(mapObj);

showBoundaryLayers();

////////////////////////////////////////////////////////////////////////  EVENT LISTENERS
let startzoom;
let bc_threshold = 6;
let cd_threshold = 8;
const status_divs = [$("#forecast-status"), $("#historic-status"), $("#flowduration-status"), $("#daily-status")];
const chart_divs = [$("#forecast-chart"), $("#historic-chart"), $("#flowduration-chart"), $("#daily-chart")];
// $("#forecast_tab_link").on('click', function () {
    // Plotly.Plots.resize($("#forecast-chart .js-plotly-plot")[0]);
// });
// $("#historical_tab_link").on('click', function () {
    // Plotly.Plots.resize($("#historical-chart .js-plotly-plot")[0]);
// });
// $("#seasonal_avg_tab_link").on('click', function () {
    // Plotly.Plots.resize($("#seasonal-chart .js-plotly-plot")[0]);
// });
mapObj.on("click", function (event) {
    if (mapObj.getZoom() >= cd_threshold) {
        if (marker) {mapObj.removeLayer(marker)}
        reachid = drainage_layer.GetFeatureInfo(event);
        marker = L.marker(event.latlng).addTo(mapObj);
        marker.bindPopup('<b>Watershed/Region:</b> ' + $("#watersheds_select_input").val() + '<br><b>Reach ID:</b> ' + reachid);
        needsRefresh = {'ForecastStats': true, 'HistoricSimulation': true, 'FlowDurationCurve': true, 'SeasonalAverage': true};

        for (let i in status_divs) {
            status_divs[i].html(' (cleared)');
            status_divs[i].css('color', 'grey');
        }
        for (let i in chart_divs) {
            chart_divs[i].html('')
        }
        $("#chart_modal").modal('show');
        askAPI('ForecastStats');
        askAPI('HistoricSimulation');
        askAPI('FlowDurationCurve');
        askAPI('SeasonalAverage');
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
    drainage_layer = getDrainageLine(waterselect + '-drainageline');
    ctrllayers = {
        'Watershed Boundary': boundary_layer,
        'Catchment Boundaries': catchment_layer,
        'Drainage Lines': drainage_layer,
    };
    controlsObj = L.control.layers(basemapObj, ctrllayers).addTo(mapObj);
    mapObj.setMaxZoom(12);
});

////////////////////////////////////////////////////////////////////////  GET DATA FROM API
function askAPI(method) {
    if (!reachid) {return}
    else if (!needsRefresh[method]) {return}
    console.log('started ' + method);
    let div, status, charttab;
    let table = $("#forecast-table");
    if (method.includes('Forecast')) {
        div = $("#forecast-chart");
        status = $("#forecast-status");
        charttab = $("#forecast_tab_link");
        table.html('');
    } else if (method.includes('Historic')) {
        div = $("#historical-chart");
        status = $("#historical-status");
        charttab = $("#historical_tab_link");
    } else if (method.includes('FlowDuration')) {
        div = $("#flowduration-chart");
        status = $("#flowduration-status");
        charttab = $("#flow_duration_tab_link");
    } else if (method.includes('Season')) {
        div = $("#seasonal-chart");
        status = $("#seasonal-status");
        charttab = $("#seasonal_avg_tab_link");
    }
    div.html('<img src="https://www.ashland.edu/sites/all/themes/ashlandecard/2014card/images/load.gif">');
    div.css('text-align', 'center');
    status.html(' (loading)');
    status.css('color', 'orange');
    needsRefresh[method] = false;
    $.ajax({
        type: 'GET',
        async: true,
        url: '/apps/streamflowservices/query' + L.Util.getParamString({method: method, reach_id: reachid}),
        success: function (html) {
            console.log('success ' + method);
            charttab.tab('show');
            status.html(' (ready)');
            status.css('color', 'green');
            div.html(html['plot']);
            if (typeof(html['table']) != "undefined") {
                table.html(html['table'])
            }
        },
        error: function () {
            console.log('error ' + method);
            div.html('');
            status.html(' (failed)');
            status.css('color', 'red');
            needsRefresh[method] = true;
        }
    })
}