import json
import requests
import pandas

from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from django.http import JsonResponse
from tethys_sdk.gizmos import SelectInput

from io import StringIO
from plotly.offline import plot as offplot
from plotly.graph_objs import Scatter, Scattergl, Layout, Figure

from .options import watersheds_db
from .app import Streamflowservices as App


@login_required()
def home(request):
    """
    Controller for the app home page.
    """
    context = {}

    return render(request, 'streamflowservices/home.html', context)


@login_required()
def animation(request):
    """
    Controller for the streamflow animation page.
    """
    context = {}
    return render(request, 'streamflowservices/animationmap.html', context)


@login_required()
def map(request):
    """
    Controller for the map viewer page.
    """
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

    return render(request, 'streamflowservices/map.html', context)


@login_required()
def api(request):
    context = {}
    return render(request, 'streamflowservices/api.html', context)


def query(request):
    data = request.GET
    method = data['method']
    # params = {'region': data['region'], 'lat': float(data['lat']), 'lon': float(data['lon']), 'return_format': 'csv'}
    params = {'region': 'africa-continental', 'reach_id': 125180, 'return_format': 'csv'}
    endpoint = 'http://global-streamflow-prediction.eastus.azurecontainer.io/api/'
    asdf = pandas.read_csv(StringIO(requests.get(endpoint + method, params=params).text))
    if 'Forecast' in method:
        tmp = asdf[['datetime', 'mean (m3/s)']].dropna(axis=0)
        meanplot = Scatter(
            name='Mean',
            x=list(tmp['datetime']),
            y=list(tmp['mean (m3/s)']),
            line=dict(color='blue'),
        )
        tmp = asdf[['datetime', 'max (m3/s)']].dropna(axis=0)
        rangemax = max(asdf['max (m3/s)'])
        maxplot = Scatter(
            name='Max',
            x=list(tmp['datetime']),
            y=list(tmp['max (m3/s)']),
            fill='tonexty',
            mode='lines',
            line=dict(color='rgb(152, 251, 152)', width=0)
        )
        tmp = asdf[['datetime', 'min (m3/s)']].dropna(axis=0)
        minplot = Scatter(
            name='Min',
            x=list(tmp['datetime']),
            y=list(tmp['min (m3/s)']),
            fill=None,
            mode='lines',
            line=dict(color='rgb(152, 251, 152)')
        )
        tmp = asdf[['datetime', 'std_dev_range_lower (m3/s)']].dropna(axis=0)
        stdlow = Scatter(
            name='Std. Dev. Lower',
            x=list(tmp['datetime']),
            y=list(tmp['std_dev_range_lower (m3/s)']),
            fill='tonexty',
            mode='lines',
            line=dict(color='rgb(152, 251, 152)', width=0)
        )
        tmp = asdf[['datetime', 'std_dev_range_upper (m3/s)']].dropna(axis=0)
        stdup = Scatter(
            name='Std. Dev. Upper',
            x=list(tmp['datetime']),
            y=list(tmp['std_dev_range_upper (m3/s)']),
            fill='tonexty',
            mode='lines',
            line={'width': 0, 'color': 'rgb(34, 139, 34)'}
        )
        tmp = asdf[['datetime', 'high_res (m3/s)']].dropna(axis=0)
        hires = Scatter(
            name='HRES',
            x=list(tmp['datetime']),
            y=list(tmp['high_res (m3/s)']),
            line={'color': 'black'}
        )
        layout = Layout(
            title='Forecasted Streamflow',
            xaxis={'title': 'Date'},
            yaxis={
                'title': 'Streamflow (m<sup>3</sup>/s)',
                'range': [0, 1.2 * rangemax]
            },
        )
        plotdiv = offplot(
            Figure([minplot, meanplot, maxplot, stdlow, stdup, hires], layout=layout),
            config={'autosizable': True, 'responsive': True},
            output_type='div',
            include_plotlyjs=False
        )
        return JsonResponse({'data': plotdiv})
    elif 'Historic' in method:
        layout = Layout(
            title='Historic Streamflow Simulation',
            xaxis={
                'title': 'Date',
                'hoverformat': '%b %d %Y',
                'tickformat': '%Y'
            },
            yaxis={
                'title': 'Streamflow (m<sup>3</sup>/s)',
                'range': [0, 1.2 * max(asdf['streamflow (m3/s)'])]
            },
        )
        plotdiv = offplot(
            Figure([Scattergl(x=asdf['datetime'].tolist(), y=asdf['streamflow (m3/s)'].tolist())], layout=layout),
            config={'autosizable': True, 'responsive': True},
            output_type='div',
            include_plotlyjs=False
        )
        return JsonResponse({'data': plotdiv})
    else:  # 'Season' in method:
        asdf['day'] = pandas.to_datetime(asdf['day'] + 1, format='%j')
        layout = Layout(
            title='Daily Average Streamflow (Historic Simulation)',
            xaxis={
                'title': 'Date',
                'hoverformat': '%b %d (%j)',
                'tickformat': '%b'
            },
            yaxis={
                'title': 'Streamflow (m<sup>3</sup>/s)',
                'range': [0, 1.2 * max(asdf['streamflow_avg (m3/s)'])]
            },
        )
        plotdiv = offplot(
            Figure([Scatter(x=asdf['day'].tolist(), y=asdf['streamflow_avg (m3/s)'].tolist())], layout=layout),
            config={'autosizable': True, 'responsive': True},
            output_type='div',
            include_plotlyjs=False
        )
        return JsonResponse({'data': plotdiv})
