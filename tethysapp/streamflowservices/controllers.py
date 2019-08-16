import json

from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from tethys_sdk.gizmos import SelectInput, ToggleSwitch

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

    units_toggle_switch = ToggleSwitch(
        display_text='Units:',
        name='units-toggle',
        on_label='Metric',
        off_label='English',
        size='mini',
        initial=True
    )

    context = {
        'watersheds': json.dumps({'list': list(watersheds_db())}),
        'gs_url': url,
        'gs_workspace': workspace,

        'units_toggle_switch': units_toggle_switch,
    }

    return render(request, 'streamflowservices/map.html', context)


@login_required()
def api(request):
    context = {}
    return render(request, 'streamflowservices/api.html', context)
