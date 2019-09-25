import json
import requests
import pandas
import datetime

from django.shortcuts import render
from django.template.loader import render_to_string
from django.http import JsonResponse
from tethys_sdk.gizmos import SelectInput

from io import StringIO
from plotly.offline import plot as offplot
from plotly.graph_objs import Scatter, Scattergl, Layout, Figure
import plotly.graph_objs as go

from .options import watersheds_db
from .app import Streamflowservices as App


def home(request):
    return render(request, 'streamflowservices/home.html', {})


def workshop(request):
    return render(request, 'streamflowservices/workshop.html', {})


def map(request):
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


def animation(request):
    return render(request, 'streamflowservices/animationmap.html', {})


def api(request):
    return render(request, 'streamflowservices/api.html', {})


def query(request):
    data = request.GET
    method = data['method']
    # params = {'region': data['region'], 'reach_id': data['reachid'], 'return_format': 'csv'}
    params = {'region': 'africa-continental', 'reach_id': 131655, 'return_format': 'csv'}
    endpoint = 'http://global-streamflow-prediction.eastus.azurecontainer.io/api/'
    data = pandas.read_csv(StringIO(requests.get(endpoint + method, params=params).text))
    if 'Forecast' in method:
        # get the start/end date and date range
        tmp = data[['datetime']]
        startdate = tmp.iloc[0][0]
        enddate = tmp.iloc[-1][0]
        start_datetime = datetime.datetime.strptime(startdate, "%Y-%m-%d %H:00:00")
        span = datetime.datetime.strptime(enddate, "%Y-%m-%d %H:00:00") - start_datetime
        uniqueday = [start_datetime + datetime.timedelta(days=i) for i in range(span.days + 2)]
        # get the return periods for the stream reach
        returns = pandas.read_csv(
            StringIO(requests.get(endpoint + 'ReturnPeriods', params=params).text), index_col='return period')
        r2 = returns.iloc[3][0]
        r10 = returns.iloc[2][0]
        r20 = returns.iloc[1][0]
        # get the ensemble distribution for the stream reach
        ensemble = pandas.read_csv(
            StringIO(requests.get(endpoint + 'ForecastEnsembles', params=params).text), index_col='datetime')
        ensemble.index = pandas.to_datetime(ensemble.index)

        # Build the ensemble stat table- iterate over each day and then over each ensemble.
        returntable = {'days': [], 'r2': [], 'r10': [], 'r20': []}
        for i in range(len(uniqueday) - 1):  # (-1) omit the extra day used for reference only
            tmp = ensemble.loc[uniqueday[i]:uniqueday[i + 1]]
            returntable['days'].append(uniqueday[i].strftime('%b %d'))
            num2 = 0
            num10 = 0
            num20 = 0
            for column in tmp:
                if any(i > r20 for i in tmp[column].to_numpy()):
                    num2 += 1
                    num10 += 1
                    num20 += 1
                elif any(i > r10 for i in tmp[column].to_numpy()):
                    num10 += 1
                    num2 += 1
                elif any(i > r2 for i in tmp[column].to_numpy()):
                    num2 += 1
            returntable['r2'].append(round(num2 * 100 / 52))
            returntable['r10'].append(round(num10 * 100 / 52))
            returntable['r20'].append(round(num20 * 100 / 52))

        tmp = data[['datetime', 'mean (m3/s)']].dropna(axis=0)
        meanplot = Scatter(
            name='Mean',
            x=list(tmp['datetime']),
            y=list(tmp['mean (m3/s)']),
            line=dict(color='blue'),
        )
        tmp = data[['datetime', 'max (m3/s)']].dropna(axis=0)
        rangemax = max(data['max (m3/s)'])
        maxplot = Scatter(
            name='Max',
            x=list(tmp['datetime']),
            y=list(tmp['max (m3/s)']),
            fill='tonexty',
            mode='lines',
            line=dict(color='rgb(152, 251, 152)', width=0)
        )
        tmp = data[['datetime', 'min (m3/s)']].dropna(axis=0)
        minplot = Scatter(
            name='Min',
            x=list(tmp['datetime']),
            y=list(tmp['min (m3/s)']),
            fill=None,
            mode='lines',
            line=dict(color='rgb(152, 251, 152)')
        )
        tmp = data[['datetime', 'std_dev_range_lower (m3/s)']].dropna(axis=0)
        stdlow = Scatter(
            name='Std. Dev. Lower',
            x=list(tmp['datetime']),
            y=list(tmp['std_dev_range_lower (m3/s)']),
            fill='tonexty',
            mode='lines',
            line=dict(color='rgb(152, 251, 152)', width=0)
        )
        tmp = data[['datetime', 'std_dev_range_upper (m3/s)']].dropna(axis=0)
        stdup = Scatter(
            name='Std. Dev. Upper',
            x=list(tmp['datetime']),
            y=list(tmp['std_dev_range_upper (m3/s)']),
            fill='tonexty',
            mode='lines',
            line={'width': 0, 'color': 'rgb(34, 139, 34)'}
        )
        tmp = data[['datetime', 'high_res (m3/s)']].dropna(axis=0)
        hires = Scatter(
            name='Higher Resolution',
            x=list(tmp['datetime']),
            y=list(tmp['high_res (m3/s)']),
            line={'color': 'black'}
        )
        layout = Layout(
            title='Forecasted Streamflow<br>Stream ID: ' + str(params['reach_id']),
            xaxis={'title': 'Date'},
            yaxis={
                'title': 'Streamflow (m<sup>3</sup>/s)',
                'range': [0, 1.2 * rangemax]
            },
            shapes=[
                go.layout.Shape(
                    type='rect',
                    x0=startdate,
                    x1=enddate,
                    y0=r2,
                    y1=r10,
                    line={'width': 0},
                    opacity=.4,
                    fillcolor='yellow'
                ),
                go.layout.Shape(
                    type='rect',
                    x0=startdate,
                    x1=enddate,
                    y0=r10,
                    y1=r20,
                    line={'width': 0},
                    opacity=.4,
                    fillcolor='red'
                ),
                go.layout.Shape(
                    type='rect',
                    x0=startdate,
                    x1=enddate,
                    y0=r20,
                    y1=1.2 * rangemax,
                    line={'width': 0},
                    opacity=.4,
                    fillcolor='purple'
                ),
            ]
        )
        plotdiv = offplot(
            Figure([minplot, meanplot, maxplot, stdlow, stdup, hires], layout=layout),
            config={'autosizable': True, 'responsive': True},
            output_type='div',
            include_plotlyjs=False
        )
        return JsonResponse({
            'plot': plotdiv,
            'table': render_to_string('streamflowservices/template_returntable.html', returntable)
        })
    elif 'Historic' in method:
        returns = pandas.read_csv(
            StringIO(requests.get(endpoint + 'ReturnPeriods', params=params).text), index_col='return period')
        r2 = returns.iloc[3][0]
        r10 = returns.iloc[2][0]
        r20 = returns.iloc[1][0]

        dates = data['datetime'].tolist()
        startdate = dates[0]
        enddate = dates[-1]

        layout = Layout(
            title='Historic Streamflow Simulation',
            xaxis={
                'title': 'Date',
                'hoverformat': '%b %d %Y',
                'tickformat': '%Y'
            },
            yaxis={
                'title': 'Streamflow (m<sup>3</sup>/s)',
                'range': [0, 1.2 * max(data['streamflow (m3/s)'])]
            },
            shapes=[
                go.layout.Shape(
                    type='rect',
                    x0=startdate,
                    x1=enddate,
                    y0=r2,
                    y1=r10,
                    line={'width': 0},
                    opacity=.4,
                    fillcolor='yellow'
                ),
                go.layout.Shape(
                    type='rect',
                    x0=startdate,
                    x1=enddate,
                    y0=r10,
                    y1=r20,
                    line={'width': 0},
                    opacity=.4,
                    fillcolor='red'
                ),
                go.layout.Shape(
                    type='rect',
                    x0=startdate,
                    x1=enddate,
                    y0=r20,
                    y1=1.2 * 1.2 * max(data['streamflow (m3/s)']),
                    line={'width': 0},
                    opacity=.4,
                    fillcolor='purple'
                ),
            ]
        )
        plotdiv = offplot(
            Figure([Scattergl(x=dates, y=data['streamflow (m3/s)'].tolist())], layout=layout),
            config={'autosizable': True, 'responsive': True},
            output_type='div',
            include_plotlyjs=False
        )
        return JsonResponse({'plot': plotdiv})
    else:  # 'Season' in method:
        data['day'] = pandas.to_datetime(data['day'] + 1, format='%j')
        layout = Layout(
            title='Daily Average Streamflow (Historic Simulation)',
            xaxis={
                'title': 'Date',
                'hoverformat': '%b %d (%j)',
                'tickformat': '%b'
            },
            yaxis={
                'title': 'Streamflow (m<sup>3</sup>/s)',
                'range': [0, 1.2 * max(data['streamflow_avg (m3/s)'])]
            },
        )
        plotdiv = offplot(
            Figure([Scatter(x=data['day'].tolist(), y=data['streamflow_avg (m3/s)'].tolist())], layout=layout),
            config={'autosizable': True, 'responsive': True},
            output_type='div',
            include_plotlyjs=False
        )
        return JsonResponse({'plot': plotdiv})
