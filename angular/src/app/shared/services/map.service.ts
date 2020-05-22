import { Injectable } from '@angular/core';
import { HttpService } from 'src/app/shared/services/http.service';
import { DataService } from './data.service';
import * as mapboxgl from 'mapbox-gl';
import * as globals from 'src/app/shared/globals';
import { TsCoordinate, TsPlotPathOptions, TsLineStyle, TsFeatureCollection, TsLineString, TsFeature, TsPosition } from 'src/app/shared/interfaces';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class MapService {

  private accessToken: string = globals.mapboxAccessToken;
  public tsMap: mapboxgl.Map;
  // keep track of what is plotted in activeLayers object
  // if a path is plotted its pathId will be present as a key in the object.  The value of the objects is an array of the associated markers
  // this is public because it is acccessed by map-create, which extends map
  public activeLayers: {[pathId: string]: Array<mapboxgl.Marker>} = {};
  // public markers: Array<mapboxgl.Marker> = [];

  constructor(
    public httpService: HttpService,
    public dataService: DataService,
    public auth: AuthService
  ) {
    // get and set the mapbox access token to enable the api
    Object.getOwnPropertyDescriptor(mapboxgl, 'accessToken').set(this.accessToken);
  }

  /**
   * Shows the mapbox map
   * @param location location on which to centre the map
   * NOTE that no path is plotted during initialisation - need to call addLayer function
   */
  initialiseMap(location?: TsCoordinate, zoom?: number) {

    // setting the center and zoom here prevents flying animation - zoom gets over-ridden when the map bounds are set below
    return new Promise<Array<TsCoordinate>>( (resolve, reject) => {
      this.tsMap = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/cjaudgl840gn32rnrepcb9b9g',
        center: location ? location : this.auth.getUser().homeLngLat,
        zoom: zoom ? zoom : 13
      });

      this.tsMap.on('load', () => {
        resolve();
      });

      this.tsMap.on('moveend', (ev) => {
        try {
          this.dataService.mapBoundsEmitter.emit(this.getMapBounds());
        } catch {}
      });

      this.tsMap.addControl(new mapboxgl.NavigationControl(), 'bottom-left');


    });

  }

  /**
   * Two methods to determine what is being shown
   * getMapView - reutrns the centrepoint and zoom level
   * getMapBounds - returns the bounding box of the current view - called by this class
   */
  getMapView() {
    const centre = this.tsMap.getCenter();
    const zoom = this.tsMap.getZoom();
    return {centre, zoom};
  }

  getMapBounds() {
    const mapBounds = this.tsMap.getBounds();
    return [mapBounds.getSouthWest().lng, mapBounds.getSouthWest().lat, mapBounds.getNorthEast().lng, mapBounds.getNorthEast().lat];
  }

  /**
   * plots a geojson path on the map and centers the view on it
   * @param pathAsGeoJSON path as geojson to view on map
   * @param styleOptions object containing the desired style options; geoJson properties are used unless overridden with styleOptions
   *          lineWidth
   *          lineColor
   *          lineOpacity
   * @param plotOptions object containing the following options:
   *          booReplaceExisting - if true will replace ALL existing plotted paths - DEFAULTS to false
   *          booResizeView      - if true will resize the viewport around the new route - DEFAULTS to false
   *          booSaveToStore     - if true will save to dataService - DEFAULTS to false
   *          booPlotMarkers     - if true will plot markers at start and end (not desired for overlay)
   * Performs the following tasks TODO split into seperate routines:
   * 1) Remove existing layers **if booReplaceExisting is true**
   * 2) Gets the supplied pathId and pushes to class array
   * 3) Adds the new layer to the map
   * 4) Plots markers at the start and end of the route **if booPlotMarkers is true**
   * 5) Set the bounds of the view **if booResizeView is true**
   * 6) Emits the new geoJSON so stats can be picked up by details panels (and prints to console) **if booSaveToStore is true**
   * 7) When the map has finished navigating to the desired view, send save the view to datsaService to be picked up by create new
   */
  addLayerToMap(pathAsGeoJSON, styleOptions?: TsLineStyle, plotOptions?: TsPlotPathOptions ) {

    // keep a track of what layers are active by pushing current id to activelayers array
    const pathId = pathAsGeoJSON.properties.pathId;
    this.activeLayers[pathId] = [];

    // used for debugging - allows points to be shown
    // this.addPointsLayer(pathAsGeoJSON);

    // add the layer to the map
    this.tsMap.addLayer({
      id: pathId,
      type: 'line',
      source: {
        type: 'geojson',
        data: pathAsGeoJSON
      },
      paint: {
        // if property is defined in style options then use it, otherwise use what is provided on the geoJson
        'line-width': styleOptions.lineWidth ? styleOptions.lineWidth : ['get', 'lineWidth'],
        'line-color': styleOptions.lineColour ? styleOptions.lineColour : ['get', 'lineColour'],
        'line-opacity': styleOptions.lineOpacity ? styleOptions.lineOpacity : ['get', 'lineOpacity']
      }
    });

    // this is for debugging only, but dont delete cos it is useful
    // this.addPointsLayer(pathAsGeoJSON);

    // plot a marker at the start and end of the route, pushing the new markers to activeLayers
    const nFeatures = pathAsGeoJSON.features.length;
    const nPoints = pathAsGeoJSON.features[nFeatures - 1].geometry.coordinates.length;
    if (nPoints > 0 && plotOptions.booPlotMarkers) {
      this.addMarkerToMap(pathAsGeoJSON.features[0].geometry.coordinates[0], pathId);
      this.addMarkerToMap(pathAsGeoJSON.features[nFeatures - 1].geometry.coordinates[nPoints - 1], pathId);
    }

    // set the bounds
    if (plotOptions.booResizeView) {
      const bbox: [mapboxgl.LngLatLike, mapboxgl.LngLatLike] =
        [[pathAsGeoJSON.bbox[0], pathAsGeoJSON.bbox[1]], [pathAsGeoJSON.bbox[2], pathAsGeoJSON.bbox[3]]];
      const options = {
        padding: {top: 10, bottom: 10, left: 10, right: 10},
        linear: true
      };
      this.tsMap.fitBounds(bbox, options);
    }

    // emit the pathStats to the details component
    if (plotOptions.booSaveToStore) {
      this.dataService.activePathEmitter.emit(pathAsGeoJSON);
      this.dataService.saveToStore('activePath', pathAsGeoJSON);
      console.log(pathAsGeoJSON);    // always useful to see the active geoJson in the console
    }

    // share the map centre so we can use later if we want to create a new map on this position
    // IMPORTANT to wait until the map has stopped moving or this doesnt work
    // TODO Emit when this has heppened so we can error check when someone clicks navigation too soon
    this.tsMap.on('moveend', (ev) => {
      this.dataService.saveToStore('mapView', this.getMapView());
    });

  }  // addLayerToMap

  /***************************************************************************
   * REMOVE STUFF
   ***************************************************************************

  /**
   * Delete a layer and any associated points
   * @param pid string defining the desire path Id
   * If pathId is not specified defaults to layer [0] - if that doesnt exist will throw an error
   */
  removeLayerFromMap(pid: string) {
    // check that the path we think we are deleting exists on the map
    // console.log('delete layer', this.activeLayers);
    if (this.tsMap.getLayer(pid)) {
      this.tsMap.removeLayer(pid);
      this.tsMap.removeSource(pid);
    } else {
      console.log('removeLayerFromMap: pathId ' + pid + ' not found.');
    }

    // if the pid exists then also delete any markers
    if (pid in this.activeLayers) {
      this.removeMarkersFromPath(pid);
      delete this.activeLayers[pid];
    }
  }

  clearMap() {
    for (const key in this.activeLayers) {
      if (!this.activeLayers.hasOwnProperty(key)) { continue; }
      if (this.tsMap.getLayer(key)) {
        this.tsMap.removeLayer(key);
        this.tsMap.removeSource(key);
      }
    }
    this.removeMarkersFromMap();
    this.activeLayers = {};
  }


  /**
   * Loop through each marker in a given path and remove all markers from the map
   * @param pid string defining the desired path Id
   */
  removeMarkersFromPath(pid: string) {
    // console.log('delete markers', this.activeLayers);
    this.activeLayers[pid].forEach( (marker: mapboxgl.Marker) => {
      // console.log(marker);
      marker.remove();
    });
    this.activeLayers[pid] = [];
    // console.log(this.activeLayers);
  }

  /**
   * Loop through each key (path) in activeLayers and remove all markers from the map
   */
  removeMarkersFromMap() {
    for (const key in this.activeLayers) {
      if (!this.activeLayers.hasOwnProperty(key)) { continue; }
      this.activeLayers[key].forEach( (marker: mapboxgl.Marker) => marker.remove());
      this.activeLayers[key] = [];
    }
  }



  /***************************************************************************
   * ADD OR REPLACE STUFF
   ***************************************************************************/

  /**
   * Add a marker to the map AND ASSOCIATES IT TO PATHID
   * @param pos TsCoordinate defining the desired position of the marker
   * @param pid string defining the desire path Id
   * If pathId is not specified defaults to layer [0] - if that doesnt exist will throw an error
   */
  addMarkerToMap(pos: TsCoordinate, pid: string) {
    // deals with the specific case of creating a point before line is created, eg when creating a route
    if (!(pid in this.activeLayers)) { this.activeLayers[pid] = []; }
    const newMarker = new mapboxgl.Marker()
      .setLngLat(pos)
      .addTo(this.tsMap);
    this.activeLayers[pid].push(newMarker);
  }

  /**
   * Remove the last marker in the marker array for a given path id, and replace it with new one
   * If there isnt already a marker it will just add a new one, no worries
   * @param pos TsCoordinate defining the desired position of the marker
   * @param pid string defining the desire path Id
   */
  // replaceLastMarkerOnPath(pos: TsCoordinate, pid: string) {
  //   this.activeLayers[pid].pop().remove();
  //   this.addMarkerToPath(pos, pid);
  // }

  /***************************************************************************
   * UTILITIES
   ***************************************************************************/

  // function to determine if map has been created yet - called by routes-list component
  isMap() {
    return !!this.tsMap;
  }

  // function to destroy the map - called in onDestroy of routes-list component
  killMap() {
    this.tsMap = null;
  }

  /***************************************************************************
   * Set default location by clicking screen
   ***************************************************************************/
  getLocationOnClick() {
    this.tsMap.getCanvas().style.cursor = 'crosshair';
    return new Promise<TsCoordinate>( (resolve, reject) => {
      this.tsMap.on('click', (e) => {
        this.tsMap.getCanvas().style.cursor = 'pointer';
        resolve({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      });
    });
  }


  /***************************************************************************
   *
   *
   * USEFUL FOR DEBUGGING
   *
   *
   * **************************************************************************/

  /**
   * Show points on map - used for debugging esp backend matching algorithms
   * Details on how to find the apprpriate factors here:
   *   https://stackoverflow.com/questions/37599561/drawing-a-circle-with-the-radius-in-miles-meters-with-mapbox-gl-js
   *   https://docs.mapbox.com/help/glossary/zoom-level/
   */
  addPointsLayer(geoJson: TsFeatureCollection) {

    const CIRCLE_RADIUS = 30; // desired radius of circle in metres

    if (this.tsMap.getLayer('circles')) {
      this.tsMap.removeLayer('circles');
      this.tsMap.removeSource('circles');
    }

    this.tsMap.addLayer({
      id: 'circles',
      type: 'circle',
      source: {
        type: 'geojson',
        data: this.getPointsGeoJson(geoJson)
      },
      paint: {
        'circle-radius': [
          'interpolate', ['exponential', 2], ['zoom'],
              0, 0,
              22, ['/', CIRCLE_RADIUS, ['/', 0.019, ['cos', ['/', ['*', ['get', 'latitude'], ['pi']], 180]]]]
        ],
        'circle-opacity': 0,
        'circle-stroke-width': 2,
        'circle-stroke-color': [
          'case', ['==', ['get', 'matched'], true], 'red', 'blue'
        ]
      }
    });

    if (this.tsMap.getLayer('matchPairs')) {
      this.tsMap.removeLayer('matchPairs');
      this.tsMap.removeSource('matchPairs');
    }

    this.tsMap.addLayer({
      id: 'matchPairs',
      type: 'line',
      source: {
        type: 'geojson',
        data: this.getMatchPairsGeoJson(geoJson)
      },
      paint: {
        // if property is defined in style options then use it, otherwise use what is provided on the geoJson
        'line-width': 2,
        'line-color': 'red'
      }
    });


  }

  /**
   * Create a new geoJson with only points as features
   * Note that map/reduce is more pretty but map doesnt work on union type (type1 | type2)
   * as defined in interfaces - couldn't fix so used forEach instead
   *   matched array is copy paste from backend console output when gpx file is loaded -it
   *   is used to colour matched points differently
   */
  getPointsGeoJson(geoJson: TsFeatureCollection) {

    const pointFeatures = [];
    const coordsArray = [];
    const matchedPairs = geoJson.properties.params.matchedPoints;
    const flatMatched = matchedPairs.reduce( (arr, elem) => arr.concat(elem), []);

    geoJson.features.forEach( (feature, fi) => {
      feature.geometry.coordinates.forEach( (coordinate, ci) => {
        if (fi !== 0 && ci === 0 ) {
        } else {
          coordsArray.push(coordinate);
        }
      });
    });

    coordsArray.forEach( (coordinate, ci) => {
      pointFeatures.push(
        <TsFeature>{
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: coordinate
          },
          properties: {
            latitude: coordinate[1],
            matched: flatMatched.indexOf(ci) > 0
          }
        }
      );
    });

    return <TsFeatureCollection>{
      type: 'FeatureCollection',
      features: pointFeatures
    };

  }

  getMatchPairsGeoJson(geoJson: TsFeatureCollection) {

    const matchedPairs = geoJson.properties.params.matchedPoints;
    const coordsArray = [];
    const lineFeatures = [];

    geoJson.features.forEach( (feature, fi) => {
      feature.geometry.coordinates.forEach( (coordinate, ci) => {
        if (fi !== 0 && ci === 0 ) {
        } else {
          coordsArray.push(coordinate);
        }
      });
    });

    matchedPairs.forEach( (pair) => {
      lineFeatures.push(
        <TsFeature>{
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [ coordsArray[pair[0]], coordsArray[pair[1]] ]
          }
        }
      );
    });

    return <TsFeatureCollection>{
      type: 'FeatureCollection',
      features: lineFeatures
    };

  }

}
