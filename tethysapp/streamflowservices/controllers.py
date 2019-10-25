from django.shortcuts import render
from django.http import JsonResponse
from tethys_sdk.gizmos import SelectInput

from .options import watersheds_db
from .app import Streamflowservices as App
from .streamflow import *


def home(request):
    sds = App.get_spatial_dataset_service('geoserver', as_wms=True)
    workspace = App.get_custom_setting('geoserver_workspace')
    url = sds.replace('wms', workspace + '/wms')

    watersheds_select_input = SelectInput(
        display_text='Select A Watershed',
        name='watersheds_select_input',
        multiple=False,
        original=True,
        options=[('View All Watersheds', '')] + list(watersheds_db()),
        initial=''
    )

    context = {
        'watersheds': json.dumps({'list': list(watersheds_db())}),
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
    apitoken = App.get_custom_setting('api_token')
    if 'Forecast' in method:
        stats = forecast_stats(reach_id, apitoken)
        ensembles = forecast_ensembles(reach_id, apitoken)
        rperiods = return_periods(reach_id, apitoken)
        fp = forecast_plot(stats, rperiods, reach_id, outformat='plotly_html')
        pt = probabilities_table(stats, ensembles, rperiods)
        return JsonResponse(dict(plot=fp, table=pt))
    elif 'Historic' in method:
        hist = historic_simulation(data['reach_id'], apitoken)
        rperiods = return_periods(data['reach_id'], apitoken)
        return JsonResponse(dict(plot=historical_plot(hist, rperiods, outformat='plotly_html')))
    else:  # 'Season' in method:
        daily = seasonal_average(data['reach_id'], apitoken)
        return JsonResponse(dict(plot=daily_avg_plot(daily, outformat='plotly_html')))
