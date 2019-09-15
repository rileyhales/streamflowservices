from tethys_sdk.base import TethysAppBase, url_map_maker
from tethys_sdk.app_settings import CustomSetting, SpatialDatasetServiceSetting


class Streamflowservices(TethysAppBase):
    """
    Tethys app class for Streamflow Prediction Services.
    """

    name = 'Streamflow Prediction Services'
    index = 'streamflowservices:home'
    icon = 'streamflowservices/images/water.jpg'
    package = 'streamflowservices'
    root_url = 'streamflowservices'
    color = '#3b8392'
    description = 'An app for consuming all the services available from the Global Streamflow Prediction service ' \
                  'developed at Brigham Young University'
    tags = ''
    enable_feedback = False
    feedback_emails = []

    def url_maps(self):
        UrlMap = url_map_maker(self.root_url)
        return (
            UrlMap(
                name='home',
                url='streamflowservices',
                controller='streamflowservices.controllers.home'
            ),
            UrlMap(
                name='workshop',
                url='streamflowservices/workshop',
                controller='streamflowservices.controllers.workshop'
            ),
            UrlMap(
                name='animation',
                url='streamflowservices/animation',
                controller='streamflowservices.controllers.animation'
            ),
            UrlMap(
                name='map',
                url='streamflowservices/map',
                controller='streamflowservices.controllers.map'
            ),
            UrlMap(
                name='api',
                url='streamflowservices/api',
                controller='streamflowservices.controllers.api'
            ),
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

