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
        let reachid = null;
        let drain_area = null;

        if (url) {
            $.ajax({
                async: false,
                type: "GET",
                url: url,
                info_format: 'application/json',
                success: function (data) {
                    reachid = data.features[0].properties['COMID'];
                    drain_area = data.features[0].properties['Tot_Drain_'];
                }
            });
        }
        return [reachid, drain_area]
    },
});

L.tileLayer.WMFS = function (url, options) {
    return new L.TileLayer.WMFS(url, options);
};
////////////////////////////////////////////////////////////////////////  MAP FUNCTIONS AND VARIABLES
function hydroviewer() {
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
    ctrllayers['VIIRS Imagery'] = VIIRSlayer;
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
    let region = layername.replace('-boundary','').replace('-catchment','');
    return L.tileLayer.wms(gsURL, {
        version: '1.1.0',
        layers: 'HS-' + watersheds_hydroshare_ids[region] + ':' + layername + ' ' + layername,
        useCache: true,
        crossOrigin: false,
        format: 'image/png',
        transparent: true,
        opacity: 1,
        pane: 'watershedlayers',
    })
}
function getDrainageLine(layername) {
    let region = layername.replace('-drainageline','');
    return L.tileLayer.WMFS(gsURL, {
        version: '1.1.0',
        layers: 'HS-' + watersheds_hydroshare_ids[region] + ':' + layername + ' ' + layername,
        useCache: true,
        crossOrigin: false,
        format: 'image/png',
        transparent: true,
        opacity: 1,
        pane: 'watershedlayers',
    })
}
function getVIIRS() {
    return L.tileLayer('https://floods.ssec.wisc.edu/tiles/RIVER-FLDglobal-composite/{z}/{x}/{y}.png', {
        layers: 'RIVER-FLDglobal-composite: Latest',
        crossOrigin: true,
        pane: 'viirs',
    });
}
let reachid;
let drain_area;
let needsRefresh = {};

let watersheds = JSON.parse($("#map").attr('watersheds'))['list'];
let watersheds_hydroshare_ids = JSON.parse($("#map").attr('watersheds_hydroshare_ids'));
let listlayers = [];
let ctrllayers = {};
let boundary_layer;
let catchment_layer;
let drainage_layer;
let marker = null;
////////////////////////////////////////////////////////////////////////  SETUP THE MAP
let mapObj = hydroviewer();
mapObj.createPane('watershedlayers');
mapObj.getPane('watershedlayers').style.zIndex = 250;
mapObj.createPane('viirs');
mapObj.getPane('viirs').style.zIndex = 200;
let VIIRSlayer = getVIIRS();
let basemapObj = basemaps();
let controlsObj;
legend.addTo(mapObj);
latlon.addTo(mapObj);

showBoundaryLayers();

////////////////////////////////////////////////////////////////////////  LISTENERS FOR MAP LAYERS
let startzoom;
let bc_threshold = 6;
let cd_threshold = 8;
const chart_divs = [$("#forecast-chart"), $("#forecast-table"), $("#historical-chart"), $("#historical-table"), $("#seasonal-chart"), $("#flowduration-chart")];
mapObj.on("click", function (event) {
    if (mapObj.getZoom() >= cd_threshold) {
        if (marker) {mapObj.removeLayer(marker)}
        meta = drainage_layer.GetFeatureInfo(event);
        reachid = meta[0];
        drain_area = meta[1];
        marker = L.marker(event.latlng).addTo(mapObj);
        marker.bindPopup('<b>Watershed/Region:</b> ' + $("#watersheds_select_input").val() + '<br><b>Reach ID:</b> ' + reachid);
        updateStatusIcons('cleared');
        for (let i in chart_divs) {chart_divs[i].html('')}
        $("#forecast-table").html('');
        $("#chart_modal").modal('show');
        askAPI();
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
        'VIIRS Imagery': VIIRSlayer,
    };
    controlsObj = L.control.layers(basemapObj, ctrllayers).addTo(mapObj);
    mapObj.setMaxZoom(12);
});
////////////////////////////////////////////////////////////////////////  GET DATA FROM API
function askAPI() {
    if (!reachid) {return}
    updateStatusIcons('load');
    updateDownloadLinks('clear');
    for (let i in chart_divs) {
        chart_divs[i].html('');
    }
    let ftl = $("#forecast_tab_link");
    let fc = $("#forecast-chart");
    ftl.tab('show')
    fc.html('<img src="https://www.ashland.edu/sites/all/themes/ashlandecard/2014card/images/load.gif">');
    fc.css('text-align', 'center');
    $.ajax({
        type: 'GET',
        async: true,
        url: '/apps/streamflowservices/query' + L.Util.getParamString({reach_id: reachid, drain_area: drain_area}),
        success: function (html) {
            // forecast tab
            ftl.tab('show');
            fc.html(html['fp']);
            $("#forecast-table").html(html['prob_table']);
            // records tab
            $("#records_tab_link").tab('show');
            $("#records-chart").html(html['rcp']);
            // historical tab
            $("#historical_tab_link").tab('show');
            $("#historical-int-chart").html(html['hp_i']);
            $("#historical-int-table").html(html['rp_i_table']);
            $("#historical-5-chart").html(html['hp_5']);
            $("#historical-5-table").html(html['rp_5_table']);
            // seasonal average tab
            $("#seasonal_avg_tab_link").tab('show');
            $("#seasonal-int-chart").html(html['sp_i']);
            $("#seasonal-5-chart").html(html['sp_5']);
            // flow duration tab
            $("#flow_duration_tab_link").tab('show');
            $("#flowduration-int-chart").html(html['fdp_i']);
            $("#flowduration-5-chart").html(html['fdp_5']);
            // update other messages and links
            ftl.tab('show');
            updateStatusIcons('ready');
            updateDownloadLinks('set');
        },
        error: function () {
            updateStatusIcons('fail');
            for (let i in chart_divs) {chart_divs[i].html('')}
        }
    })
}
function updateStatusIcons(type) {
    let statusObj = $("#request-status");
    if (type === 'load') {
        statusObj.html(' (loading)');
        statusObj.css('color', 'orange');
    } else if (type === 'ready') {
        statusObj.html(' (ready)');
        statusObj.css('color', 'green');
    } else if (type === 'fail') {
        statusObj.html(' (failed)');
        statusObj.css('color', 'red');
    } else if (type === 'cleared') {
        statusObj.html(' (cleared)');
        statusObj.css('color', 'grey');
    }
}
function updateDownloadLinks(type) {
    if (type === 'clear') {
        $("#download-forecast-btn").attr('href', '');
        $("#download-records-btn").attr('href', '');
        $("#download-historical-btn").attr('href', '');
        $("#download-seasonal-btn").attr('href', '');
    } else if (type === 'set') {
        $("#download-forecast-btn").attr('href', endpoint + 'ForecastStats/?reach_id=' + reachid);
        $("#download-records-btn").attr('href', endpoint + 'ForecastRecords/?reach_id=' + reachid);
        $("#download-historical-btn").attr('href', endpoint + 'HistoricSimulation/?reach_id=' + reachid);
        $("#download-seasonal-btn").attr('href', endpoint + 'SeasonalAverage/?reach_id=' + reachid);
    }
}

function fix_buttons(tab) {
    let buttons = [$("#download-forecast-btn"), $("#download-records-btn"), $("#download-historical-btn"), $("#download-seasonal-btn")]
    for (i in buttons) {buttons[i].hide()}
    if (tab === 'forecast') {buttons[0].show();$("#toggle_historical").hide()}
    else if (tab === 'records') {buttons[1].show();$("#toggle_historical").hide()}
    else if (tab === 'historical') {buttons[2].show();$("#toggle_historical").show()}
    else if (tab === 'seasonal') {buttons[3].show();$("#toggle_historical").show()}
    else if (tab === 'flowduration') {$("#toggle_historical").show()}
    fix_chart_sizes(tab);
    $("#resize_charts").attr({'onclick': "fix_chart_sizes('" + tab + "')"})
}
function fix_chart_sizes(tab) {
    let divs = [];
    if (tab === 'forecast') {divs = [$("#forecast-chart .js-plotly-plot")]}
    else if (tab === 'records') {divs = [$("#records-chart .js-plotly-plot")]}
    else if (tab === 'historical') {divs = [$("#historical-5-chart .js-plotly-plot"), $("#historical-int-chart .js-plotly-plot")]}
    else if (tab === 'seasonal') {divs = [$("#seasonal-5-chart .js-plotly-plot"), $("#seasonal-int-chart .js-plotly-plot")];}
    else if (tab === 'flowduration') {divs = [$("#flowduration-5-chart .js-plotly-plot"), $("#flowduration-int-chart .js-plotly-plot")];}
    for (let i in divs) {
        divs[i].css('height', 500);
        Plotly.Plots.resize(divs[i][0]);
    }
}
$("#forecast_tab_link").on('click', function (){fix_buttons('forecast')})
$("#records_tab_link").on('click', function (){fix_buttons('records')})
$("#historical_tab_link").on('click', function (){fix_buttons('historical')})
$("#seasonal_avg_tab_link").on('click', function (){fix_buttons('seasonal')})
$("#flow_duration_tab_link").on('click', function (){fix_buttons('flowduration')})
$("#toggle_historical").on('click', function () {
    $("#historical-5").toggle('show');
    $("#historical-int").toggle('show');
    $("#seasonal-5-chart").toggle('show');
    $("#seasonal-int-chart").toggle('show');
    $("#flowduration-5-chart").toggle('show');
    $("#flowduration-int-chart").toggle('show');
})