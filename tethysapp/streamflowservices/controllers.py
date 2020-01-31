import json
import os
import geoglows.streamflow as sf

from django.shortcuts import render
from django.http import JsonResponse
from tethys_sdk.gizmos import SelectInput

from .app import Streamflowservices as App

watersheds_db = (
        ('Islands', 'islands-geoglows'),
        ('Australia', 'australia-geoglows'),
        ('Japan', 'japan-geoglows'),
        ('East Asia', 'east_asia-geoglows'),
        ('South Asia', 'south_asia-geoglows'),
        ('Central Asia', 'central_asia-geoglows'),
        ('West Asia', 'west_asia-geoglows'),
        ('Middle East', 'middle_east-geoglows'),
        ('Europe', 'europe-geoglows'),
        ('Africa', 'africa-geoglows'),
        ('South America', 'south_america-geoglows'),
        ('Central America', 'central_america-geoglows'),
        ('North America', 'north_america-geoglows')
)


def hydroviewer(request):
    sds = App.get_spatial_dataset_service('geoserver', as_wms=True)
    workspace = App.get_custom_setting('geoserver_workspace')
    url = sds.replace('wms', workspace + '/wms')

    watersheds_select_input = SelectInput(
        display_text='Select A Watershed',
        name='watersheds_select_input',
        multiple=False,
        original=True,
        options=[('View All Watersheds', '')] + list(watersheds_db),
        initial=''
    )

    context = {
        'watersheds': json.dumps({'list': list(watersheds_db)}),
        'watersheds_select_input': watersheds_select_input,
        'gs_url': url,
        'gs_workspace': workspace,
        'endpoint': sf.BYU_ENDPOINT,
    }

    return render(request, 'streamflowservices/hydroviewer.html', context)


def animation(request):
    app_workspace = App.get_app_workspace()
    with open(os.path.join(app_workspace.path, 'countries.geojson')) as json_data:
        data_dict = json.load(json_data)
    return render(request, 'streamflowservices/animation.html', {'countries': data_dict})


def query(request):
    data = request.GET
    drain_area = data['drain_area']
    reach_id = data['reach_id']
    stats = sf.forecast_stats(reach_id, endpoint=sf.BYU_ENDPOINT)
    ensembles = sf.forecast_ensembles(reach_id, endpoint=sf.BYU_ENDPOINT)
    hist = sf.historic_simulation(reach_id, endpoint=sf.BYU_ENDPOINT)
    rperiods = sf.return_periods(reach_id, endpoint=sf.BYU_ENDPOINT)
    daily = sf.seasonal_average(reach_id, endpoint=sf.BYU_ENDPOINT)
    return JsonResponse(dict(
        fp=sf.forecast_plot(stats, rperiods, reach_id=reach_id, drain_area=drain_area, outformat='plotly_html'),
        hp=sf.historical_plot(hist, rperiods, reach_id=reach_id, drain_area=drain_area, outformat='plotly_html'),
        fdp=sf.flow_duration_curve_plot(hist, reach_id=reach_id, drain_area=drain_area, outformat='plotly_html'),
        sp=sf.seasonal_plot(daily, reach_id=reach_id, drain_area=drain_area, outformat='plotly_html'),
        table=sf.probabilities_table(stats, ensembles, rperiods)
    ))
