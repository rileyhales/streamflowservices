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
    da = data['drain_area']
    reach_id = data['reach_id']
    stats = sf.forecast_stats(reach_id)
    rec = sf.forecast_records(reach_id)
    ens = sf.forecast_ensembles(reach_id)
    hist_5 = sf.historic_simulation(reach_id)
    hist_i = sf.historic_simulation(reach_id, forcing='era_interim')
    rper_5 = sf.return_periods(reach_id)
    rper_i = sf.return_periods(reach_id, forcing='era_interim')
    seas_5 = sf.seasonal_average(reach_id)
    seas_i = sf.seasonal_average(reach_id, forcing='era_interim')
    return JsonResponse(dict(
        fp=sf.hydroviewer_plot(rec, stats, rper_5, reach_id=reach_id, drain_area=da, outformat='plotly_html'),
        rcp=sf.records_plot(rec, rper_5, outformat='plotly_html'),
        hp_5=sf.historical_plot(hist_5, rper_5, reach_id=reach_id, drain_area=da, outformat='plotly_html'),
        hp_i=sf.historical_plot(hist_i, rper_i, reach_id=reach_id, drain_area=da, outformat='plotly_html'),
        sp_5=sf.seasonal_plot(seas_5, reach_id=reach_id, drain_area=da, outformat='plotly_html'),
        sp_i=sf.seasonal_plot(seas_i, reach_id=reach_id, drain_area=da, outformat='plotly_html'),
        fdp_5=sf.flow_duration_curve_plot(hist_5, reach_id=reach_id, drain_area=da, outformat='plotly_html'),
        fdp_i=sf.flow_duration_curve_plot(hist_i, reach_id=reach_id, drain_area=da, outformat='plotly_html'),
        prob_table=sf.probabilities_table(stats, ens, rper_5),
        rp_5_table=sf.return_periods_table(rper_5),
        rp_i_table=sf.return_periods_table(rper_i)
    ))
