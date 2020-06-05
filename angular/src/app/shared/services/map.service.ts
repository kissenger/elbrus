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
  private mapCanvas;

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

      console.log('tsMap');
      this.tsMap = new mapboxgl.Map({
        container: 'map',
        // style: 'mapbox://styles/mapbox/cjaudgl840gn32rnrepcb9b9g',
        style: 'mapbox://styles/kissenger/ckapl476e00p61iqeivumz4ey',
        center: location ? location : this.auth.getUser().homeLngLat,
        zoom: zoom ? zoom : 13
      });

      this.tsMap.on('load', () => {
        this.dataService.saveToStore('mapView', this.getMapView());
        this.mapCanvas = this.tsMap.getCanvasContainer();
        resolve();
      });

      // this.tsMap.on('mousemove', function(e) {
      //   document.getElementById('info').innerHTML =
      //   // e.point is the x, y coordinates of the mousemove event relative
      //   // to the top-left corner of the map
      //   JSON.stringify(e.point) +
      //   '<br />' +
      //   // e.lngLat is the longitude, latitude geographical position of the event
      //   JSON.stringify(e.lngLat.wrap());
      //   });


      // called when the map is moved by user, or when the initial animation is complete
      this.tsMap.on('moveend', (ev) => {
        this.dataService.saveToStore('mapView', this.getMapView());
        try {
          this.dataService.mapBoundsEmitter.emit(this.getMapBounds());
        } catch {}
      });


      this.tsMap.addControl(new mapboxgl.NavigationControl(), 'bottom-left');


    });

  }

  /**
   * Two methods to determine what is being shown
   * getMapView - reutrns the centrepoint and zoom level - used by other services to determine what was being shown
   * before option was selected
   * getMapBounds - returns the bounding box of the current view - called by this class but who is the listener? (TODO:)
   * TODO: Do we need both methods?
   */
  getMapView() {
    const centre = this.tsMap.getCenter();
    const zoom = this.tsMap.getZoom();
    return {centre, zoom};
  }

  getMapBounds() {
    // called by list - used to filter shown routes to those intersecting the current view
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
  addPathToMap(pathAsGeoJSON, styleOptions?: TsLineStyle, plotOptions?: TsPlotPathOptions ) {

    console.log(pathAsGeoJSON);    // always useful to see the active geoJson in the console
    this.activeLayers[pathAsGeoJSON.properties.pathId] = [];

    // used for debugging - allows points to be shown
    // this.addMatchedPointsLayer(pathAsGeoJSON);

    this.addLineLayer(pathAsGeoJSON, styleOptions);

    // if (plotOptions.booPlotPoints) {
    //   this.addPointsLayer(pathAsGeoJSON);
    // }

    if (plotOptions.booPlotMarkers) {
      this.addMarkers(pathAsGeoJSON);
    }

    if (plotOptions.booResizeView) {
      this.setMapBounds(pathAsGeoJSON);
    }

    if (plotOptions.booSaveToStore) {
      this.emitPathStatsToStore(pathAsGeoJSON);
    }

    // share the map centre so we can use later if we want to create a new map on this position
    // IMPORTANT to wait until the map has stopped moving or this doesnt work
    // TODO: Emit when this has heppened so we can error check when someone clicks navigation too soon
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
  removePathFromMap(pid: string) {

    if (this.tsMap.getLayer(pid)) {
      this.tsMap.removeLayer(pid);
      this.tsMap.removeSource(pid);
    } else {
      console.log('removeLayerFromMap: pathId ' + pid + ' not found.');
    }


    if (pid in this.activeLayers) {
      this.removeMarkersFromPath(pid);
      delete this.activeLayers[pid];
    }


  }

  clearMap() {
    for (const key in this.activeLayers) {
      if (!this.activeLayers.hasOwnProperty(key)) {
        continue;
      }
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
    console.log('delete markers', this.activeLayers);
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

  addMarkers(geoJson) {
    const nFeatures = geoJson.features.length;
    const nPoints = geoJson.features[geoJson.features.length - 1].geometry.coordinates.length;
    if (nPoints > 0) {
      this.addMarkerToMap(geoJson.features[0].geometry.coordinates[0], geoJson.properties.pathId);
      this.addMarkerToMap(geoJson.features[geoJson.features.length - 1].geometry.coordinates[nPoints - 1], geoJson.properties.pathId);
    }
  }


  addMarkerToMap(pos: TsCoordinate, pid: string) {
    // deals with the specific case of creating a point before line is created, eg when creating a route
    if (!(pid in this.activeLayers)) { this.activeLayers[pid] = []; }
    const newMarker = new mapboxgl.Marker()
      .setLngLat(pos)
      .addTo(this.tsMap);
    this.activeLayers[pid].push(newMarker);

  }

  addLineLayer(path, styleOptions) {
    this.tsMap.addLayer({
      id: path.properties.pathId,
      type: 'line',
      source: {
        type: 'geojson',
        data: path
      },
      paint: {
        // if property is defined in style options then use it, otherwise use what is provided on the geoJson
        'line-width': styleOptions.lineWidth ? styleOptions.lineWidth : ['get', 'lineWidth'],
        'line-color': styleOptions.lineColour ? styleOptions.lineColour : ['get', 'lineColour'],
        'line-opacity': styleOptions.lineOpacity ? styleOptions.lineOpacity : ['get', 'lineOpacity']
      }
    });
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

  setMapBounds(geoJSON) {
    const bbox: [mapboxgl.LngLatLike, mapboxgl.LngLatLike] =
      [[geoJSON.bbox[0], geoJSON.bbox[1]], [geoJSON.bbox[2], geoJSON.bbox[3]]];
    const options = {
      padding: {top: 10, bottom: 10, left: 10, right: 10},
      linear: true
    };
    this.tsMap.fitBounds(bbox, options);
  }

  emitPathStatsToStore(geoJSON) {
    this.dataService.activePathEmitter.emit(geoJSON);
    this.dataService.saveToStore('activePath', geoJSON);
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
  addMatchedPointsLayer(geoJson: TsFeatureCollection) {

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
        data: this.getMatchedPointsGeoJson(geoJson)
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
  getMatchedPointsGeoJson(geoJson: TsFeatureCollection) {

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


  /**
   * Creates a linestring between matched points for visualisation
   */
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




  getPointsGeoJson(geoJson: TsFeatureCollection) {

    const coordsArray = [];

    // get list of coordinates from all features
    geoJson.features.forEach( (feature, fIndex) => {
      feature.geometry.coordinates.forEach( (coordinate, cIndex) => {
        if (fIndex !== 0 && cIndex === 0 ) {
          // prevents duplicating first point
        } else {
          coordsArray.push(coordinate);
        }
      });
    });

    console.log(coordsArray.length);

    // create features
    const pointFeatures = coordsArray.map( (coord, index) => this.getPointFeature(coord, `${index}`) );
    console.log(pointFeatures);

    return this.getFeatureCollection(pointFeatures);

  }

  getFeatureCollection(features: Array<TsFeature>) {
    return <TsFeatureCollection>{
      type: 'FeatureCollection',
      features: features
    };
  }

  getPointFeature(point: TsPosition, pointId: string) {
    return <TsFeature> {
      type: 'Feature',
      id: pointId,
      geometry: {
        type: 'Point',
        coordinates: point
      }
    };
  }


}
