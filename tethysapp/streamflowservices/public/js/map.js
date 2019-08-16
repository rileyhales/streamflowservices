////////////////////////////////////////////////////////////////////////  MAP FUNCTIONS
function map(zoomList) {
    return L.map('map', {
        zoom: 3,
        minZoom: 3,
        maxZoom: 12,
        boxZoom: true,
        maxBounds: L.latLngBounds(L.latLng(-100, -270), L.latLng(100, 270)),
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

function getWatershedComponent(layername) {
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

////////////////////////////////////////////////////////////////////////  WEB MAPPING FEATURE SERVICE EXTENSION
L.TileLayer.WMFS = L.TileLayer.WMS.extend({
    onAdd: function (map) {
        L.TileLayer.WMS.prototype.onAdd.call(this, map);
        map.on('click', this.GetFeatureInfo, this);
    },
    onRemove: function (map) {
        L.TileLayer.WMS.prototype.onRemove.call(this, map);
        map.off('click', this.GetFeatureInfo, this);
    },

    GetFeatureInfo: function (evt) {
        if (document.getElementById('map').style.cursor === 'pointer') {
            // Construct a GetFeatureInfo request URL given a point
            let point = this._map.latLngToContainerPoint(evt.latlng, this._map.getZoom());
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
                info_format: 'application/json'
            };
            params[params.version === '1.3.0' ? 'i' : 'x'] = point.x;
            params[params.version === '1.3.0' ? 'j' : 'y'] = point.y;

            let url = this._url + L.Util.getParamString(params, this._url, true);

            if (url) {
                $.ajax({
                    type: "GET",
                    url: url,
                    info_format: 'application/json',
                    success: function (data) {
                        if (data.features.length !== 0) {
                            $("#chart_modal").modal('show');
                            getstreamflow(data.features[0].properties['COMID'])
                        } else {
                            console.log('No features where you clicked so you got an error ' + data);
                        }
                    },
                });
            } else {
                console.log('Unable to extract the right GetFeatureInfo Url');
            }
        }
    },
});

L.tileLayer.WMFS = function (url, options) {
    return new L.TileLayer.WMFS(url, options);
};

////////////////////////////////////////////////////////////////////////  SETUP THE MAP
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

////////////////////////////////////////////////////////////////////////  SETUP THE MAP
let mapObj = map();
let basemapObj = basemaps();
let watersheds = JSON.parse($("#map").attr('watersheds'))['list'];
legend.addTo(mapObj);
latlon.addTo(mapObj);

let boundary_layers = [];
let drainage_layers = [];
let catchment_layers = [];
let currentlayers = {};

for (let i = 0; i < watersheds.length; i++) {
    boundary_layers.push([watersheds[i][0] + ' Boundary', getWatershedComponent(watersheds[i][1] + '-boundary')]);
    catchment_layers.push([watersheds[i][0] + ' Catchments', getWatershedComponent(watersheds[i][1] + '-catchment')]);
    drainage_layers.push([watersheds[i][0] + ' Drainage Lines', getWatershedComponent(watersheds[i][1] + '-drainage_line')]);
}

// todo this should be put into a function that restores the map to the original view
for (let i = 0; i < boundary_layers.length; i++) {
    boundary_layers[i][1].addTo(mapObj);
    currentlayers[boundary_layers[i][0]] = boundary_layers[i][1];
}
let controlsObj = L.control.layers(basemapObj, currentlayers).addTo(mapObj);

////////////////////////////////////////////////////////////////////////  MAP EVENT LISTENERS- MOUSEMOVE, ZOOM
let startzoom;

mapObj.on("mousemove", function (event) {
    $("#mouse-position").html('Lat: ' + event.latlng.lat.toFixed(5) + ', Lon: ' + event.latlng.lng.toFixed(5));
});
mapObj.on('zoomstart', function (event) {
    startzoom = event.target.getZoom();
});
mapObj.on('zoomend', function (event) {
    let endzoom = event.target.getZoom();
    let bc_threshold = 6;
    let cd_threshold = 8;

    // if you start+end over/under the max/min threshold then there is no need to change layers
    if (startzoom >= cd_threshold && endzoom >= cd_threshold) {return}
    if (cd_threshold >= startzoom >= bc_threshold && cd_threshold >= endzoom >= bc_threshold) {return}
    if (startzoom <= bc_threshold && endzoom <= bc_threshold) {return}

    // remove all the layers from the map and reset the JSON of current layers
    for (let i in currentlayers) {
        controlsObj.removeLayer(currentlayers[i]);
        mapObj.removeLayer(currentlayers[i]);
    }
    currentlayers = {};

    // todo change all these to use proper js for loop syntax

    // add layers to the map based on what zoom you ended at
    if (endzoom >= cd_threshold) {
        $("#map").css('cursor', 'pointer');
        for (let i in drainage_layers) {
            drainage_layers[i][1].addTo(mapObj);
            currentlayers[drainage_layers[i][0]] = drainage_layers[i][1];
        }
    } else if (endzoom >= bc_threshold) {
        $("#map").css('cursor', '');
        for (let i in catchment_layers) {
            catchment_layers[i][1].addTo(mapObj);
            currentlayers[catchment_layers[i][0]] = catchment_layers[i][1];
        }
    } else {
        $("#map").css('cursor', '');
        for (let i in boundary_layers) {
            boundary_layers[i][1].addTo(mapObj);
            currentlayers[boundary_layers[i][0]] = boundary_layers[i][1];
        }
    }
    // put the map controls back on the map after changing all the layers
    mapObj.removeControl(controlsObj);
    controlsObj = L.control.layers(basemapObj, currentlayers).addTo(mapObj)
});

////////////////////////////////////////////////////////////////////////  GET CHART DATA BY AJAX
let dates = {highres: [], dates: []};
let values = {highres: [], max: [], mean: [], min: [], std_dev_range_lower: [], std_dev_range_upper: []};

function titleCase(str) {
    str = str.toLowerCase().split('_');
    for (let i = 0; i < str.length; i++) {
        str[i] = str[i].charAt(0).toUpperCase() + str[i].slice(1);
    }
    return str.join(' ');
}

function getstreamflow(comid) {
    let watershed = "north_america"; // todo make this change every time
    let subbasin = "continental";
    let url = 'https://tethys.byu.edu/apps/streamflow-prediction-tool/api/GetForecast/';
    let params = {watershed_name: watershed, subbasin_name: subbasin, reach_id: comid, return_format: 'csv'};
    $.ajax({
        type: 'GET',
        async: false,
        url: url + L.Util.getParamString(params),
        dataType: 'text',
        contentType: "text/plain",
        headers: {'Authorization': "Token 2d03550b3b32cdfd03a0c876feda690d1d15ad40"},
        success: function (data) {
            if ($('#long-term-chart').length) {
                Plotly.purge('long-term-chart');
            }
            let allLines = data.split('\n');
            let headers = allLines[0].split(',');

            for (let i = 1; i < allLines.length; i++) {
                let data = allLines[i].split(',');

                if (headers.includes('high_res (m3/s)')) {
                    dates.highres.push(data[0]);
                    values.highres.push(data[1]);
                    if (data[2] !== 'nan') {
                        dates.dates.push(data[0]);
                        values.max.push(data[2]);
                        values.mean.push(data[3]);
                        values.min.push(data[4]);
                        values.std_dev_range_lower.push(data[5]);
                        values.std_dev_range_upper.push(data[6]);
                    }
                } else {
                    dates.dates.push(data[0]);
                    values.max.push(data[1]);
                    values.mean.push(data[2]);
                    values.min.push(data[3]);
                    values.std_dev_range_lower.push(data[4]);
                    values.std_dev_range_upper.push(data[5]);
                }
            }
        },
        complete: function () {
            let mean = {name: 'Mean', x: dates.dates, y: values.mean, mode: "lines", line: {color: 'blue'}};

            let max = {
                name: 'Max',
                x: dates.dates,
                y: values.max,
                fill: 'tonexty',
                mode: "lines",
                line: {color: 'rgb(152, 251, 152)', width: 0}
            };

            let min = {
                name: 'Min',
                x: dates.dates,
                y: values.min,
                fill: 'none',
                mode: "lines",
                line: {color: 'rgb(152, 251, 152)'}
            };

            let std_dev_lower = {
                name: 'Std. Dev. Lower',
                x: dates.dates,
                y: values.std_dev_range_lower,
                fill: 'tonexty',
                mode: "lines",
                line: {color: 'rgb(152, 251, 152)', width: 0}
            };

            let std_dev_upper = {
                name: 'Std. Dev. Upper',
                x: dates.dates,
                y: values.std_dev_range_upper,
                fill: 'tonexty',
                mode: "lines",
                line: {color: 'rgb(152, 251, 152)', width: 0}
            };

            let data = [min, max, std_dev_lower, std_dev_upper, mean];

            if (values.highres.length > 0) {
                data.push({
                    name: 'HRES',
                    x: dates.highres,
                    y: values.highres,
                    mode: "lines",
                    line: {color: 'black'}
                });
            }

            let layout = {
                title: titleCase(watershed) + ' Forecast<br>Reach ID: ' + comid,
                xaxis: {title: 'Date'},
                yaxis: {title: 'Streamflow m3/s', range: [0, Math.max(...values.max) + Math.max(...values.max) / 5]},
            };

            Plotly.newPlot("long-term-chart", data, layout);

            // let index = dates.dates.length - 2;
            // console.log(index);
            // getreturnperiods(dates.dates[0], dates.dates[index], watershed, subbasin, comid);

            dates.highres = [];
            dates.dates = [];
            values.highres = [];
            values.max = [];
            values.mean = [];
            values.min = [];
            values.std_dev_range_lower = [];
            values.std_dev_range_upper = [];
        }

    });
}

////////////////////////////////////////////////////////////////////////  THINGS THAT NEED TO BE DONE STILL
// todo get historical data (api)
// todo do we still want the change warning points v time option? how do we do that if they're all from the api? actually how does that work now?
