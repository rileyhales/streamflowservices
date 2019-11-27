import json
import geoglows.streamflow as sf

from django.shortcuts import render
from django.http import JsonResponse
from tethys_sdk.gizmos import SelectInput

from .app import Streamflowservices as App

watersheds_db = (
        ('Indonesia', 'indonesia-geoglows'),
        ('Australia', 'australia-geoglows'),
        ('Japan', 'japan-geoglows'),
        ('East Asia', 'east_asia-geoglows'),
        ('South Asia', 'south_asia-geoglows'),
        ('Central Asia', 'central_asia-geoglows'),
        # ('West Asia', 'west_asia-geoglows'),
        ('Middle East', 'middle_east-geoglows'),
        ('Europe', 'europe-geoglows'),
        ('Africa', 'africa-geoglows'),
        ('South America', 'south_america-geoglows'),
        ('Central America', 'central_america-geoglows'),
        ('North America', 'north_america-geoglows')
)


def home(request):
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
    }

    return render(request, 'streamflowservices/home.html', context)


def animation(request):
    return render(request, 'streamflowservices/animationmap.html', {})


def api(request):
    return render(request, 'streamflowservices/api.html', {})


def about(request):
    return render(request, 'streamflowservices/about.html', {})


def workshop(request):
    return render(request, 'streamflowservices/workshop.html', {})


def query(request):
    data = request.GET
    method = data['method']
    reach_id = data['reach_id']
    if 'Forecast' in method:
        stats = sf.forecast_stats(reach_id, endpoint=sf.BYU_ENDPOINT)
        ensembles = sf.forecast_ensembles(reach_id, endpoint=sf.BYU_ENDPOINT)
        rperiods = sf.return_periods(reach_id, endpoint=sf.BYU_ENDPOINT)
        fp = sf.forecast_plot(stats, rperiods, reach_id=reach_id, outformat='plotly_html')
        pt = sf.probabilities_table(stats, ensembles, rperiods)
        return JsonResponse(dict(plot=fp, table=pt))
    elif 'Historic' in method:
        hist = sf.historic_simulation(reach_id, endpoint=sf.BYU_ENDPOINT)
        rperiods = sf.return_periods(reach_id, endpoint=sf.BYU_ENDPOINT)
        return JsonResponse(dict(plot=sf.historical_plot(hist, rperiods, reach_id=reach_id, outformat='plotly_html')))
    else:  # 'Season' in method:
        daily = sf.seasonal_average(reach_id, endpoint=sf.BYU_ENDPOINT)
        return JsonResponse(dict(plot=sf.seasonal_plot(daily, outformat='plotly_html')))
