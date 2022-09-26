import { UnitsStringPipe } from './../pipes/units-string.pipe';
import { HttpService } from './http.service';
import { Injectable } from '@angular/core';
import { DataService } from './data.service';
import * as mapboxgl from 'mapbox-gl';
import * as globals from 'src/app/shared/globals';
import { TsCoordinate, TsPlotPathOptions, TsLineStyle, TsFeatureCollection, TsFeature, TsBoundingBox, TsPosition, TsMapType } from 'src/app/shared/interfaces';
import { AuthService } from './auth.service';
import { environment } from 'src/environments/environment';
import { ActivePathLayers } from '../classes/active-layers';
import { Path } from '../classes/path-class';
import { GeoJsonPipe } from 'src/app/shared/pipes/geojson.pipe';
import { TsMarkers } from '../classes/ts-markers';
import { ScreenSizeService } from './screen-size.service';

@Injectable({
  providedIn: 'root'
})

export class MapService {

  private mapboxToken: string = environment.MAPBOX_TOKEN;
  private mapboxStyles = {
    terrain: environment.MAPBOX_STYLE_TERRAIN,
    satellite: environment.MAPBOX_STYLE_SATELLITE
  };
  public isDev = !environment.production;

  public tsMap: mapboxgl.Map;
  private mapDefaultType: TsMapType = 'terrain';
  private _mapType: TsMapType = this.mapDefaultType;
  public pathLayers: ActivePathLayers;
  public markers: TsMarkers;
  private windowWidth: number;
  public BREAKPOINT = globals.BREAKPOINTS.MD;
  private padding = {
    wideScreen: {top: 50, left: 50, bottom: 50, right: 300},
    narrowScreen: {top: 10, left: 10, bottom: 10, right: 10}
  };
  public mouseoverPopup: mapboxgl.Popup;


  constructor(
    public http: HttpService,
    public data: DataService,
    private auth: AuthService,
    private geoJsonPipe: GeoJsonPipe,
    private unitsStringPipe: UnitsStringPipe,
    private screenSize: ScreenSizeService
  ) {
    Object.getOwnPropertyDescriptor(mapboxgl, 'accessToken').set(this.mapboxToken);
    this.windowWidth = this.screenSize.width;
    this.screenSize.resize.subscribe( (newWidth: {width: number, height: number}) => {
      this.windowWidth = newWidth.width;
    });
  }

  get context() {
    return this.tsMap;
  }

  newMap(startPosition?: TsCoordinate | TsPosition, startZoom?: number, boundingBox?: TsBoundingBox) {

    // setting the center and zoom here prevents flying animation - zoom gets over-ridden when the map bounds are set below
    return new Promise<mapboxgl.Map>( (resolve, reject) => {

      let mapCentre: TsCoordinate | TsPosition;
      let mapZoom: number;
      this.markers = new TsMarkers();

      if ( startPosition ) {
        // if location is provided, use that (zoom not needed as map will resize when path is added)
        mapCentre = startPosition;
        mapZoom = startZoom ? startZoom : globals.defaultMapView.zoom;

      } else if ( this.data.get('mapView') ) {
        // otherwise look for stored mapview
        mapCentre = this.data.get('mapView').centre;
        mapZoom = this.data.get('mapView').zoom;

      } else if ( this.auth.isRegistered ) {
        // if that doesnt work, try to find the default location of the logged-in user
        mapCentre = this.auth.user.homeLngLat;
        mapZoom = 12;

      } else {
        // otherwise fall back to default values
        mapCentre = globals.defaultMapView.centre;
        mapZoom = globals.defaultMapView.zoom;

      }



      if (!mapboxgl.supported()) {

        alert('Your browser does not support Mapbox GL');

      } else {

        this.tsMap = new mapboxgl.Map({
          container: 'map',
          style: this.mapboxStyles[this.mapDefaultType],
          center: mapCentre,
          zoom: mapZoom
        });

        if ( boundingBox ) {
          this.bounds = boundingBox;
        }

        this.pathLayers = new ActivePathLayers();

        this.tsMap.addControl(new mapboxgl.NavigationControl(), 'bottom-left');

        this.tsMap.on('contextmenu', this.onRightClick);

        this.tsMap.on('moveend', (event) => {
          // conditional ensures we dont update list if the screensize changes, thereby minimising calls to the backend
          if (event.originalEvent?.type === 'resize') {
          } else {
            this.data.set({mapView: this.getMapView()});
            this.data.mapBoundsEmitter.emit(this.getMapBounds());
          }
        });

        this.tsMap.on('load', () => {

          // add home marker
          if (this.auth.isRegistered) {
            this.markers.add('home', 'home', this.auth.user.homeLngLat, this.tsMap);
          }

          this.data.set({mapView: this.getMapView()});
          this.data.mapBoundsEmitter.emit(this.getMapBounds());
          resolve(this.tsMap);
        });


      }

    });

  }


  // Sets the basemap style to either 'terrain' or 'satellite'
  // Mapbox helpfully removes all layers when the style is applied, so this function gets the current layers and sources first and
  // reapplies them after the style is loaded
  public setType(type: TsMapType) {

    // get the current map style (incl layers and sources)
    const style = this.tsMap.getStyle();
    // console.log(this.tsMap.getStyle());

    // set up listener to run reapply the sources and layers when the style changes
    this.tsMap.once('sourcedata', () => {
      Object.keys(style.sources).forEach( (key) => {
        if (key !== 'composite' && key !== 'mapbox://mapbox.satellite') {
          this.tsMap.addSource(key, style.sources[key]);
          this.tsMap.addLayer(style.layers.find(layer => layer.id === key));
        }
      });
    });

    // apply the new style
    this.tsMap.setStyle(this.mapboxStyles[type]);
    this._mapType = type;

  }

  public get getType() {
    return this._mapType;
  }




  public fitViewOne() {
    this.bounds = this.data.getPath().bbox;
  }



  public fitViewAll() {
    if (this.pathLayers.length > 0) {
      this.bounds = this.pathLayers.outerBoundingBox;
    } else {
      // fall back to fitOne if there are no layers (create route mode)
      this.fitViewOne();
    }

  }




  private set bounds(boundingBox: TsBoundingBox) {

    let bbox: mapboxgl.LngLatBoundsLike ;
    bbox = [ [ boundingBox[0], boundingBox[1] ], [ boundingBox[2], boundingBox[3] ] ];

    const options = {
      padding: this.windowWidth < this.BREAKPOINT ? this.padding.narrowScreen : this.padding.wideScreen,
      linear: true
    };

    this.tsMap.fitBounds(bbox, options);

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


  public goto(point: TsPosition | TsCoordinate) {
    if ( 'lng' in point) {
      this.tsMap.flyTo({center: point});
    } else {
      this.tsMap.flyTo({center: {lng: point[0], lat: point[1]}});
    }
  }



  public add(pathAsGeoJSON: TsFeatureCollection, styleOptions?: TsLineStyle, plotOptions?: TsPlotPathOptions ) {

    return new Promise<void>( (resolve, reject) => {

      if (this.isDev) {
        console.log(pathAsGeoJSON, styleOptions, plotOptions);
      }

      const path = new Path( pathAsGeoJSON );
      const pathId = pathAsGeoJSON.properties.pathId;
      const bbox: TsBoundingBox = pathAsGeoJSON.bbox;

      // map listener will fire only once when the data has finished loading
      this.tsMap.once('idle', (e) => {
        if (plotOptions.resizeView) {
          this.bounds = pathAsGeoJSON.bbox;
        }
        if (plotOptions.plotType !== 'overlay') {
          this.data.setPath(pathAsGeoJSON);
        }
        resolve();
      });

      this.pathLayers.add(pathId, bbox);
      this.addLineLayer(pathId + 'line', styleOptions, pathAsGeoJSON);

      // for main route (not overlay)
      if (plotOptions.plotType !== 'overlay') {

        this.addStartEndMarkers(pathId, path.firstPoint, path.lastPoint);
        this.addPointsLayer(pathId + 'pts', {
          'circle-radius': 4,
          'circle-stroke-opacity':
            [ 'case',
              ['boolean', ['feature-state', 'enabled'], false ],
              1,
              ['boolean', ['feature-state', 'hover'], false ],
              1,
              0.2
          ],
          'circle-stroke-width': 1,
          'circle-opacity':
            [ 'case',
              ['boolean', ['feature-state', 'enabled'], false ],
              1,
              ['boolean', ['feature-state', 'hover'], false ],
              1,
              0
          ],
        });

        this.setLayerData(pathId + 'pts', 'Point', path.positionsList, path.pointData);

        this.tsMap.on('mouseenter', pathId + 'pts', this.onMouseOverPoint);
        this.tsMap.on('contextmenu', pathId + 'pts', this.onRightClick);
        this.tsMap.on('touchstart', pathId + 'pts', this.onRightClick);
        this.tsMap.on('mouseleave', pathId + 'pts', this.onMouseLeavePoint);
      }

    });

  }

  private onMouseOverPoint = (e: mapboxgl.MapLayerMouseEvent) => {
    this.tsMap.getCanvas().style.cursor = 'pointer';
    this.tsMap.setFeatureState( {source: this.pathLayers.topLayer.pathId + 'pts', id: e.features[0].id}, {hover: true} );
    this.tsMap.off('contextmenu', this.onRightClick);
  }

  private onMouseLeavePoint = (e: mapboxgl.MapLayerMouseEvent) => {
    this.tsMap.getCanvas().style.cursor = '';  // restores default behaviour
    this.tsMap.removeFeatureState( {source: this.pathLayers.topLayer.pathId + 'pts'});
    this.tsMap.on('contextmenu', this.onRightClick);

  }

  public onRightClick = (e: mapboxgl.MapLayerMouseEvent | mapboxgl.MapLayerTouchEvent) => {

    if (this.mouseoverPopup) {
      this.mouseoverPopup.remove();
      this.mouseoverPopup = null;
    }

    // if clicked on route then gather route information
    let routeHtml = '';
    let latLngString = '';

    if (e.features) {
      // right click on point, so route data is available

      latLngString = e.features[0].properties.latLng.substring(1, e.features[0].properties.latLng.length - 1);
      const distanceUnits = this.auth.user.units.distance;
      const elevationUnits = this.auth.user.units.elevation;
      const distanceCovered = this.unitsStringPipe.transform(e.features[0].properties.distanceCovered, 'distance', distanceUnits);
      const distanceRemaining = this.unitsStringPipe.transform(e.features[0].properties.distanceRemaining, 'distance', distanceUnits);

      let elevation = 'N/A';
      if (e.features[0].properties.elevation) {
        elevation = this.unitsStringPipe.transform(<number>e.features[0].properties.elevation, 'elevation', elevationUnits);
      }

      routeHtml = `
        <div id="popup-menu">Distance Covered: ${distanceCovered}</div>
        <div id="popup-menu">Distance Remaining: ${distanceRemaining}</div>
        <div id="popup-menu">Elevation: ${elevation}</div>
      `;

    } else {
      // right clisk on map, use click position rather than point position
      latLngString = `${Math.round(e.lngLat.lat * 1e6) / 1e6},${Math.round(e.lngLat.lng * 1e6) / 1e6}`;

    }

    const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${latLngString}`;
    const osMapsLink = `https://osmaps.ordnancesurvey.co.uk/${latLngString},16/pin`;
    const html = `
      <div id="popup-menu">Lat,Lng: ${latLngString}</div>
      ${routeHtml}
      <div id="popup-menu">Show point in <a href="${googleMapsLink}" target="_blank"> google maps</a> | <a href="${osMapsLink}" target="_blank">OS maps</a></div>
      `;

    this.mouseoverPopup = new mapboxgl.Popup({ closeOnClick: true, closeButton: true, offset: 5})
      .setLngLat(e.lngLat)
      .setHTML(html)
      .addTo(this.tsMap);

  }

  addStartEndMarkers(pathId: string, startPoint: TsPosition, endPoint: TsPosition) {
    this.markers.add(pathId + 'start', 'start', startPoint, this.tsMap);
    this.markers.add(pathId + 'finish', 'finish', endPoint, this.tsMap);
  }

  clearStartEndMarkers(pathId: string) {
    this.markers.delete(pathId + 'start');
    this.markers.delete(pathId + 'finish');
  }

  updateStartEndMarkers(pathId: string, startPoint: TsPosition, endPoint: TsPosition) {
    this.markers.move(pathId + 'start', startPoint);
    this.markers.move(pathId + 'finish', endPoint);
  }

  updateHomeMarker(newPosition: TsPosition | TsCoordinate) {
    this.markers.move('home', newPosition);
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
    });

  }

  public setLayerData(layerId: string, dataType: 'Point' | 'LineString', data: Array<TsPosition>, properties?: Array<Object>) {
    const _data = this.geoJsonPipe.transform(data, dataType, properties || null);
    (this.tsMap.getSource(layerId) as mapboxgl.GeoJSONSource).setData(_data);
  }



  public updatePosition(position: TsPosition, accuracy: number) {

    if (this.isDev) { console.log({position: position, accuracy: accuracy}); }

    if (!this.tsMap.getLayer('position')) {
      this.addPositionLayer();
      this.addAccuracyLayer();
    }

    const coords = position ? [position] : null;
    const props = position ? [{accuracy: accuracy, latitude: position[1]}] : null;
    this.setLayerData('position', 'Point', coords);
    this.setLayerData('accuracy', 'Point', coords, props);
  }



  addPositionLayer() {
    this.addPointsLayer('position', {
      'circle-radius': 4,
      'circle-opacity': 1,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#523209',
      'circle-color': '#83964B',
    });
  }



  addAccuracyLayer() {
    // 0.019 is from https://docs.mapbox.com/help/glossary/zoom-level/#zoom-levels-and-geographical-distance
    this.addPointsLayer('accuracy', {
      'circle-radius': [
        'interpolate', ['exponential', 2], ['zoom'],
            0, 0,
            22, ['/', ['get', 'accuracy'], ['*', 0.019, ['cos', ['/', ['*', ['get', 'latitude'], ['pi']], 180]]]]
      ],
      'circle-opacity': 0.1,
      'circle-stroke-width': 1,
      'circle-stroke-color': '#523209',
      'circle-stroke-opacity': 0.5,
      'circle-color': '#83964B',
    });
  }




  public remove(pathId: string) {

      this.removeLayer(pathId, 'line');
      // this.removeLayer(pathId, 'sym');
      this.removeLayer(pathId, 'pts');

      this.pathLayers.remove( pathId );

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

    // remove each active layer
    if ( this.pathLayers ) {
      this.pathLayers.get.forEach( layer => {
        this.remove(layer.pathId);
        this.clearStartEndMarkers(layer.pathId);
      });
    }

    this.pathLayers.clear();
    this.data.setPath(null);

  }


  public isMap() {
  // called by routes-list component
    return !!this.tsMap;
  }


  public kill() {
  // called in onDestroy of routes-list component
    this.tsMap = null;
  }





  public getLocationOnClick() {

    this.tsMap.getCanvas().style.cursor = 'crosshair';

    this.tsMap.on('click', (e) => {
      const location: TsCoordinate = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      this.data.clickedCoordsEmitter.emit(location);
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
