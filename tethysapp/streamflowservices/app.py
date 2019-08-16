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
    description = 'Place a brief description of your app here.'
    tags = ''
    enable_feedback = False
    feedback_emails = []

    def url_maps(self):
        """
        Add controllers
        """
        UrlMap = url_map_maker(self.root_url)

        url_maps = (
            UrlMap(
                name='home',
                url='streamflowservices',
                controller='streamflowservices.controllers.home'
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
        )

        return url_maps

    def custom_settings(self):
        """
        Define Custom Settings
        """
        custom_settings = (
            CustomSetting(
                name='geoserver_workspace',
                type=CustomSetting.TYPE_STRING,
                description='The name of the workspace that contains the SFPT-API drainage lines and catchments on the '
                            'GeoServer that you specified in Spatial Dataset Service Settings',
                required=True,
            ),
        )
        return custom_settings

    def spatial_dataset_service_settings(self):
        """
        Define Spatial Dataset Service Settings (Geoserver)
        """
        sds_settings = (
            SpatialDatasetServiceSetting(
                name='geoserver',
                description='GeoServer that will serve the spatial data services for the app',
                engine=SpatialDatasetServiceSetting.GEOSERVER,
                required=True,
            ),
        )
        return sds_settings

