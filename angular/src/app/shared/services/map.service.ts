import { Injectable } from '@angular/core';
import { HttpService } from 'src/app/shared/services/http.service';
import { DataService } from './data.service';
import * as mapboxgl from 'mapbox-gl';
<<<<<<< HEAD
import { TsCoordinate, TsPlotPathOptions, TsLineStyle, TsFeatureCollection, TsFeature, TsPosition, TsBoundingBox } from 'src/app/shared/interfaces';
import { AuthService } from './auth.service';
import { environment } from 'src/environments/environment';
import { ActiveLayers } from '../classes/active-layers';
import { Path } from '../classes/path-class';
import { GeoJsonPipe } from '../geojson.pipe';
=======
import { TsCoordinate, TsPlotPathOptions, TsLineStyle, TsFeatureCollection, TsLineString, TsFeature, TsPosition } from 'src/app/shared/interfaces';
import { AuthService } from './auth.service';
import { environment } from 'src/environments/environment';
>>>>>>> master

@Injectable({
  providedIn: 'root'
})

export class MapService {

<<<<<<< HEAD
  private accessToken = environment.MAPBOX_TOKEN;
=======
  private accessToken: string = environment.MAPBOX_TOKEN;
>>>>>>> master
  public tsMap: mapboxgl.Map;
  public layers: ActiveLayers;

  constructor(
    public httpService: HttpService,
    public dataService: DataService,
    private auth: AuthService,
    private geoJsonPipe: GeoJsonPipe
  ) {
    Object.getOwnPropertyDescriptor(mapboxgl, 'accessToken').set(this.accessToken);
  }


  newMap(location?: TsCoordinate, zoom?: number) {

    // setting the center and zoom here prevents flying animation - zoom gets over-ridden when the map bounds are set below
    return new Promise<Array<TsCoordinate>>( (resolve, reject) => {

      this.tsMap = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/kissenger/ckapl476e00p61iqeivumz4ey',
        center: location ? location : this.auth.getUser().homeLngLat,
        zoom: zoom ? zoom : 13
      });

      this.layers = new ActiveLayers();

      this.tsMap.addControl(new mapboxgl.NavigationControl(), 'bottom-left');
      this.tsMap.on('moveend', this.onMoveEnd);
      this.tsMap.on('load', () => {
        this.dataService.saveToStore('mapView', this.getMapView());
        resolve();
      });

    });

  }


  private onMoveEnd = (e) => {
    this.dataService.saveToStore('mapView', this.getMapView());
    try {
      this.dataService.mapBoundsEmitter.emit(this.getMapBounds());
    } catch (error) {
      // do nothing with the error - silently let it fail
    }
  }


  public getMapView() {
    // Used by other services to determine what is being shown so, for example, same view can be established after map change
    const centre = this.tsMap.getCenter();
    const zoom = this.tsMap.getZoom();
    return {centre, zoom};
  }


  public getMapBounds() {
    // called by list - required by backed to filter shown routes to those intersecting the current view
    const mapBounds = this.tsMap.getBounds();
    return [mapBounds.getSouthWest().lng, mapBounds.getSouthWest().lat, mapBounds.getNorthEast().lng, mapBounds.getNorthEast().lat];
  }


  public add(pathAsGeoJSON: TsFeatureCollection, styleOptions?: TsLineStyle, plotOptions?: TsPlotPathOptions ) {

    console.log(pathAsGeoJSON);    // always useful to see the active geoJson in the console

    const path = new Path( pathAsGeoJSON );
    const pathId = pathAsGeoJSON.properties.pathId;

    this.layers.add(pathId);
    this.addLineLayer(pathId + 'line', styleOptions, pathAsGeoJSON);
    // this.addPointsLayer(pathId + 'pts', path.pointsGeoJson);
    this.addSymbolLayer(pathId + 'sym', path.startEndPoints);


    if (plotOptions.booResizeView) {
      this.bounds = pathAsGeoJSON.bbox;
    }

    if (plotOptions.booSaveToStore) {
      this.dataService.activePathEmitter.emit(pathAsGeoJSON);
      this.dataService.saveToStore('activePath', pathAsGeoJSON);
    }

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


  public addPointsLayer(layerId: string, data?: TsFeatureCollection, ) {

    data = data ? data : this.geoJsonPipe.transform([], 'Point');

    this.tsMap.addSource(layerId, {type: 'geojson', data } );
    this.tsMap.addLayer({
      id: layerId,
      type: 'circle',
      source: layerId,
      paint: {
        'circle-radius': 4,
        'circle-opacity': 0.5,
        // 'circle-opacity': [ 'case', ['boolean', ['feature-state', 'hover'], false ], 1, 0 ],
        // 'circle-stroke-opacity': [ 'case', ['boolean', ['feature-state', 'hover'], false ], 1, 0 ],
        'circle-stroke-width': 1,
        // 'circle-stroke-color': 'black',
        // 'circle-color': 'black'
        'circle-color':
          [ 'case',
            ['boolean', ['feature-state', 'enabled'], false ],
            'blue',
            ['boolean', ['feature-state', 'hover'], false ],
            'black',
            'white'
          ]
      }

    });

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
        // 'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
        'text-anchor': 'bottom-left',
        'text-font': ['Open Sans Regular'],
        'text-field': '{title}',
        'text-size': 18
      }
    });

  }


  public remove(pathId: string) {

    this.removeLayer(pathId, 'line');
    this.removeLayer(pathId, 'sym');
    this.removeLayer(pathId, 'pts');

    this.layers.remove( pathId );

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
    if ( this.layers ) {
      this.layers.get.forEach( pathId => {
        this.remove(pathId);
      });
    }

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
