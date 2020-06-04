import json
import os
import geoglows

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
        'endpoint': geoglows.streamflow.ENDPOINT,
    }

    return render(request, 'streamflowservices/hydroviewer.html', context)


def animation(request):
    app_workspace = App.get_app_workspace()
    with open(os.path.join(app_workspace.path, 'countries.geojson')) as json_data:
        data_dict = json.load(json_data)
    return render(request, 'streamflowservices/animation.html', {'countries': data_dict})


# where the plotting comes from
def query(request):
    data = request.GET
    da = data['drain_area']
    reach_id = data['reach_id']
    stats = geoglows.streamflow.forecast_stats(reach_id)
    rec = geoglows.streamflow.forecast_records(reach_id)
    ens = geoglows.streamflow.forecast_ensembles(reach_id)
    hist_5 = geoglows.streamflow.historic_simulation(reach_id)
    hist_i = geoglows.streamflow.historic_simulation(reach_id, forcing='era_interim')
    rper_5 = geoglows.streamflow.return_periods(reach_id)
    rper_i = geoglows.streamflow.return_periods(reach_id, forcing='era_interim')
    seas_5 = geoglows.streamflow.seasonal_average(reach_id)
    seas_i = geoglows.streamflow.seasonal_average(reach_id, forcing='era_interim')
    titles = {'Reach ID': reach_id, 'Drainage Area': da}
    return JsonResponse(dict(
        fp=geoglows.plots.hydroviewer(rec, stats, ens, rper_5, titles=titles, outformat='plotly_html'),
        rcp=geoglows.plots.forecast_records(rec, rper_5, outformat='plotly_html'),
        hp_5=geoglows.plots.historic_simulation(hist_5, rper_5, titles=titles, outformat='plotly_html'),
        hp_i=geoglows.plots.historic_simulation(hist_i, rper_i, titles=titles, outformat='plotly_html'),
        sp_5=geoglows.plots.seasonal_average(seas_5, titles=titles, outformat='plotly_html'),
        sp_i=geoglows.plots.seasonal_average(seas_i, titles=titles, outformat='plotly_html'),
        fdp_5=geoglows.plots.flow_duration_curve(hist_5, titles=titles, outformat='plotly_html'),
        fdp_i=geoglows.plots.flow_duration_curve(hist_i, titles=titles, outformat='plotly_html'),
        prob_table=geoglows.plots.probabilities_table(stats, ens, rper_5),
        rp_5_table=geoglows.plots.return_periods_table(rper_5),
        rp_i_table=geoglows.plots.return_periods_table(rper_i)
    ))
