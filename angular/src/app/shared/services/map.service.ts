import { HttpService } from './http.service';
import { Injectable } from '@angular/core';
import { DataService } from './data.service';
import * as mapboxgl from 'mapbox-gl';
import * as globals from 'src/app/shared/globals';
import { TsCoordinate, TsPlotPathOptions, TsLineStyle, TsFeatureCollection, TsFeature, TsBoundingBox, TsPosition } from 'src/app/shared/interfaces';
import { AuthService } from './auth.service';
import { environment } from 'src/environments/environment';
import { ActiveLayers } from '../classes/active-layers';
import { Path } from '../classes/path-class';
import { GeoJsonPipe } from 'src/app/shared/pipes/geojson.pipe';

@Injectable({
  providedIn: 'root'
})

export class MapService {

  private mapboxToken: string = environment.MAPBOX_TOKEN;
  private mapboxStyle: string = environment.MAPBOX_STYLE;

  public tsMap: mapboxgl.Map;
  public layers: ActiveLayers;
  private marker: mapboxgl.Marker;

  constructor(
    public http: HttpService,
    public data: DataService,
    private auth: AuthService,
    private geoJsonPipe: GeoJsonPipe
  ) {
    Object.getOwnPropertyDescriptor(mapboxgl, 'accessToken').set(this.mapboxToken);
  }


  newMap(startPosition?: TsCoordinate, startZoom?: number) {
  // newMap(location?: TsCoordinate, zoom?: number) {

    // setting the center and zoom here prevents flying animation - zoom gets over-ridden when the map bounds are set below
    return new Promise<Array<TsCoordinate>>( (resolve, reject) => {

      let mapCentre: TsCoordinate;
      let mapZoom: number;

      if ( startPosition ) {
        // if location is provided, use that (zoom not needed as map will resize when path is added)
        mapCentre = startPosition;
        mapZoom = startZoom ? startZoom : globals.defaultMapView.zoom;

      } else if ( this.data.get('mapView', false) ) {

        // otherwise look for stored mapview
        mapCentre = this.data.get('mapView', false).centre;
        mapZoom = this.data.get('mapView', false).zoom;

      } else if ( this.auth.isRegisteredUser() ) {
        // if that doesnt work, try to find the default location of the logged-in user
        mapCentre = this.auth.getUser().homeLngLat;
        mapZoom = globals.defaultMapView.zoom;

      } else {
        // otherwise fall back to default values
        mapCentre = globals.defaultMapView.centre;
        mapZoom = globals.defaultMapView.zoom;

      }

      this.tsMap = new mapboxgl.Map({
        container: 'map',
        style: this.mapboxStyle,
        center: mapCentre,
        zoom: mapZoom
      });

      this.layers = new ActiveLayers();

      this.tsMap.addControl(new mapboxgl.NavigationControl(), 'bottom-left');

      this.tsMap.on('moveend', () => {
        console.log('map finished moving');
        this.data.set('mapView', this.getMapView());
        this.data.mapBoundsEmitter.emit(this.getMapBounds());
      });

      this.tsMap.on('load', () => {
        console.log('map finished loading');
        this.data.set('mapView', this.getMapView());
        this.data.mapBoundsEmitter.emit(this.getMapBounds());
        resolve();
      });

    });

  }


  public plotMarker(location: TsCoordinate) {
    if (this.marker) {
      this.marker.remove();
    }
    this.marker = new mapboxgl.Marker()
      .setLngLat(location)
      .addTo(this.tsMap);
  }

  public getMapView() {
    // Used by other services to determine what is being shown so, for example, same view can be established after map change
    return {centre: this.tsMap.getCenter(), zoom: this.tsMap.getZoom()};
  }


  public getMapBounds() {
    // called by list - required by backed to filter shown routes to those intersecting the current view
    const mapBounds = this.tsMap.getBounds();
    return [mapBounds.getSouthWest().lng, mapBounds.getSouthWest().lat, mapBounds.getNorthEast().lng, mapBounds.getNorthEast().lat];
  }

  public goto(point: TsPosition) {
    this.tsMap.flyTo({
      center: {lng: point[0], lat: point[1]}
      });
  }



  public add(pathAsGeoJSON: TsFeatureCollection, styleOptions?: TsLineStyle, plotOptions?: TsPlotPathOptions ) {

    return new Promise( (resolve, reject) => {

      console.log(pathAsGeoJSON);    // always useful to see the active geoJson in the console
      const path = new Path( pathAsGeoJSON );
      const pathId = pathAsGeoJSON.properties.pathId;

      // map listener will fire only once when the data has finished loading
      this.tsMap.once('idle', (e) => {
        if (plotOptions.booResizeView) { this.bounds = pathAsGeoJSON.bbox; }
        this.data.setPath(pathAsGeoJSON, plotOptions.booEmit);
        resolve();
      });

      this.layers.add(pathId);
      this.addLineLayer(pathId + 'line', styleOptions, pathAsGeoJSON);
      this.addSymbolLayer(pathId + 'sym', path.startEndPoints);

    });

  }


  public addLineLayer(layerId: string, styleOptions: TsLineStyle, data?: TsFeatureCollection) {

    data = data ? data : this.geoJsonPipe.transform([], 'LineString');

    this.tsMap.addSource(layerId, {type: 'geojson', data } );
    this.tsMap.addLayer({
      id: layerId,
      type: 'line',
      source: layerId,
      paint: {
        'line-width': styleOptions.lineWidth ? styleOptions.lineWidth : ['get', 'lineWidth'],
        'line-color': styleOptions.lineColour ? styleOptions.lineColour : ['get', 'lineColour'],
        'line-opacity': styleOptions.lineOpacity ? styleOptions.lineOpacity : ['get', 'lineOpacity']
      }
    });

  }


  public addPointsLayer(layerId: string, layerPaint: {}) {

    // if data is empty then use pipe to generate empty geoJson
    const data = this.geoJsonPipe.transform([], 'Point');

    this.tsMap.addSource(layerId, {type: 'geojson', data } );
    this.tsMap.addLayer({
      id: layerId,
      type: 'circle',
      source: layerId,
      paint: layerPaint
      // paint: {
      //   'circle-radius': 8,
      //   'circle-opacity': 0.3,
      //   'circle-stroke-width': 1,
      //   'circle-color':
      //     [ 'case',
      //       ['boolean', ['feature-state', 'enabled'], false ],
      //       'blue',
      //       ['boolean', ['feature-state', 'hover'], false ],
      //       'black',
      //       'white'
      //     ]
      // }

    });

  }

  public addDataToLayer(layerId: string, dataType: 'Point' | 'LineString', data: Array<TsPosition>) {
    const _data = this.geoJsonPipe.transform(data, dataType);
    (this.tsMap.getSource(layerId) as mapboxgl.GeoJSONSource).setData(_data);
  }


  public addSymbolLayer(layerId: string, data?: TsFeatureCollection, ) {

    data = data ? data :  this.geoJsonPipe.transform([], 'Point');

    this.tsMap.addSource(layerId, {type: 'geojson', data } );
    this.tsMap.addLayer({
      id: layerId,
      type: 'symbol',
      source: layerId,
      layout: {
        'symbol-placement': 'point',
        'text-anchor': 'bottom-left',
        'text-font': ['Open Sans Regular'],
        'text-field': '{title}',
        'text-size': 18
      }
    });

  }

  // public showPoint()


  public remove(pathId: string) {
    return new Promise( (resolve, reject) => {

      this.tsMap.once('idle', (e) => {
        this.data.pathIdEmitter.emit(pathId);
        resolve();
      });

      this.removeLayer(pathId, 'line');
      this.removeLayer(pathId, 'sym');
      this.removeLayer(pathId, 'pts');

      this.layers.remove( pathId );

    });

  }


  private removeLayer(id: string, type: string) {

    if (this.tsMap.getLayer( id + type )) {
      this.tsMap.removeLayer( id + type );
      this.tsMap.removeSource( id + type );
    } else {
      console.log(`removeLayer: layer ${id + type} not found.`);
    }

  }


  public clear() {

    return new Promise( async (resolve, reject) => {

      if ( this.layers ) {
        await Promise.all( this.layers.get.map( pathId => { this.remove(pathId); }) );
      }

      resolve();
      this.data.setPath(globals.emptyGeoJson, true);

    });
  }


  public isMap() {
  // called by routes-list component
    return !!this.tsMap;
  }


  public kill() {
  // called in onDestroy of routes-list component
    this.tsMap = null;
  }


  public set bounds(boundingBox: TsBoundingBox) {

    const bbox: mapboxgl.LngLatBoundsLike = [ [ boundingBox[0], boundingBox[1] ], [ boundingBox[2], boundingBox[3] ] ];
    const options = {
      padding: {top: 20, bottom: 20, left: 10, right: 10},
      linear: true
    };
    this.tsMap.fitBounds(bbox, options);
  }


  public getLocationOnClick() {

    this.tsMap.getCanvas().style.cursor = 'crosshair';

    // return new Promise<TsCoordinate>( (resolve, reject) => {
      this.tsMap.on('click', (e) => {
        const location = { lat: e.lngLat.lat, lng: e.lngLat.lng };
        this.plotMarker({ lat: e.lngLat.lat, lng: e.lngLat.lng });
        this.data.locationEmitter.emit(location);

        // this.tsMap.getCanvas().style.cursor = 'pointer';
        // resolve({ lat: e.lngLat.lat, lng: e.lngLat.lng });
      });
    // });

  }





  /***************************************************************************
   *
   *
   * USEFUL FOR DEBUGGING - an necessary abhoration??
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


}
