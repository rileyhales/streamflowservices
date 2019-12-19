from tethys_sdk.base import TethysAppBase, url_map_maker
from tethys_sdk.app_settings import CustomSetting, SpatialDatasetServiceSetting


class Streamflowservices(TethysAppBase):
    """
    Tethys app class for Streamflow Prediction Services.
    """

    name = 'GEOGloWS ECMWF Streamflow Explorer'
    index = 'streamflowservices:home'
    icon = 'streamflowservices/images/water.jpg'
    package = 'streamflowservices'
    root_url = 'streamflowservices'
    color = '#3b8392'
    description = 'An app for consuming all the services available from the GEOGloWS ECMWF Streamflow Prediction ' \
                  'service developed at Brigham Young University'
    enable_feedback = False
    feedback_emails = []

    def url_maps(self):
        UrlMap = url_map_maker(self.root_url)
        return (
            # Services page
            UrlMap(
                name='home',
                url='streamflowservices/map',
                controller='streamflowservices.controllers.home'
            ),
            UrlMap(
                name='animation',
                url='streamflowservices/animation',
                controller='streamflowservices.controllers.animation'
            ),

            # AJAX Controller
            UrlMap(
                name='query',
                url='streamflowservices/query',
                controller='streamflowservices.controllers.query'
            ),
        )

    def custom_settings(self):
        return (
            CustomSetting(
                name='geoserver_workspace',
                type=CustomSetting.TYPE_STRING,
                description='Name of the workspace containing the drainage line, catchment, and boundary shapefiles on '
                            'the GeoServer that you specified in Spatial Dataset Service Settings',
                required=True,
            ),
        )

    def spatial_dataset_service_settings(self):
        return (
            SpatialDatasetServiceSetting(
                name='geoserver',
                description='GeoServer that will serve the spatial data services for the app',
                engine=SpatialDatasetServiceSetting.GEOSERVER,
                required=True,
            ),
        )

