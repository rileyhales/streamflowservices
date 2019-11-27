# GEOGloWS ECMWF Streamflow Explorer

This app requires a geoserver to show the Boundary, Catchment, and Drainage Line shapefiles for each of the regions 
the tool was developed for. The shapefiles are available on HydroShare.

You need to preserve exactly this naming convention when you upload your shapefiles to geoserver.
* world_region-geoglows-boundary
* world_region-geoglows-catchment
* world_region-geoglows-drainageline

These shapefiles must be in the same geoserver workspace which you provide as a custom setting e.g. spt-geoglows