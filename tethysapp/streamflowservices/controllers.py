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

watersheds_hydroshare_IDs = {
        'islands-geoglows': 'e3910292be5e4fd79597c6c91cb084cf',
        'australia-geoglows': '9572eb7fa8744807962b9268593bd4ad',
        'japan-geoglows': 'df5f3e52c51b419d8ee143b919a449b3',
        'east_asia-geoglows': '85ac5bf29cff4aa48a08b8aaeb8e3023',
        'south_asia-geoglows': 'e8f2896be57643eb91220351b961b494',
        'central_asia-geoglows': '383bc50a88ae4711a8d834a322ced2d5',
        'west_asia-geoglows': 'b62087b814804242a1005368d0ba1b82',
        'middle_east-geoglows': '6de72e805b34488ab1742dae64202a29',
        'europe-geoglows': 'c14e1644a94744d8b3204a5be91acaed',
        'africa-geoglows': '121bbce392a841178476001843e7510b',
        'south_america-geoglows': '94f7e730ea034706ae3497a75c764239',
        'central_america-geoglows': '36fae4f0e04d40ccb08a8dd1df88365e',
        'north_america-geoglows': '43ae93136e10439fbf2530e02156caf0'
}


def hydroviewer(request):
    watersheds_select_input = SelectInput(
        display_text='Select A Watershed',
        name='watersheds_select_input',
        multiple=False,
        original=True,
        options=[('View All Watersheds', '')] + list(watersheds_db),
        initial=''
    )

    context = {
        'watersheds_list': json.dumps({'list': list(watersheds_db)}),
        'watersheds_hydroshare_ids': json.dumps(watersheds_hydroshare_IDs),
        'watersheds_select_input': watersheds_select_input,
        'gs_url': 'https://geoserver.hydroshare.org/geoserver/wms',
        'endpoint': sf.HOSTS.byu,
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
    stats = sf.forecast_stats(reach_id)
    ensembles = sf.forecast_ensembles(reach_id)
    hist = sf.historic_simulation(reach_id)
    rperiods = sf.return_periods(reach_id)
    daily = sf.seasonal_average(reach_id)
    return JsonResponse(dict(
        fp=sf.forecast_plot(stats, rperiods, reach_id=reach_id, drain_area=drain_area, outformat='plotly_html'),
        hp=sf.historical_plot(hist, rperiods, reach_id=reach_id, drain_area=drain_area, outformat='plotly_html'),
        fdp=sf.flow_duration_curve_plot(hist, reach_id=reach_id, drain_area=drain_area, outformat='plotly_html'),
        sp=sf.seasonal_plot(daily, reach_id=reach_id, drain_area=drain_area, outformat='plotly_html'),
        table=sf.probabilities_table(stats, ensembles, rperiods)
    ))
