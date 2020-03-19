from tethys_sdk.base import TethysAppBase, url_map_maker


class Streamflowservices(TethysAppBase):
    """
    Tethys app class for GEOGloWS ECMWF Streamflow Explorer.
    """

    name = 'GEOGloWS ECMWF Streamflow Explorer'
    index = 'streamflowservices:home'
    icon = 'streamflowservices/images/water.jpg'
    package = 'streamflowservices'
    root_url = 'streamflowservices'
    color = '#2980b9'
    description = ''
    tags = ''
    enable_feedback = False
    feedback_emails = []

    def url_maps(self):
        """
        Add controllers
        """
        UrlMap = url_map_maker(self.root_url)
        return (
            # Services page
            UrlMap(
                name='home',
                url='streamflowservices/',
                controller='streamflowservices.controllers.hydroviewer'
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
