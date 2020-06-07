import { Injectable } from '@angular/core';
import { MapService } from './map.service';
import { HttpService } from './http.service';
import { DataService } from './data.service';
import { TsCoordinate, TsPlotPathOptions, TsLineStyle, TsPosition, TsFeature, TsFeatureCollection } from 'src/app/shared/interfaces';
import { SpinnerService } from 'src/app/shared/services/spinner.service';
import { AuthService } from 'src/app/shared/services/auth.service';
import { PathHistory } from 'src/app/shared/classes/path-history';
import { ActivePoints } from 'src/app/shared/classes/active-points';
import { AlertService } from './alert.service';

@Injectable({
  providedIn: 'root'
})

/**
 * A child of the MapService, MapCreateService provides the functions to create a new route on the map
 * Seems to get instantiated when the map loads, possibly because create map is a child of map?  Bit of
 * a benign bug - need to ensure if a create route is cancelled, we clear history as class is not reinstantiated
 */
export class MapCreateService extends MapService {

  private history: PathHistory;
  private options = { snapProfile: 'driving' };
  private plotOptions: TsPlotPathOptions = {
    booResizeView: false,
    booSaveToStore: true,
    booPlotMarkers: true,
    booPlotPoints: true
  };
  private styleOptions: TsLineStyle = {};
  private activePoints: ActivePoints;
  private selectedPointId: number;
  private selectedLineIds: Array<{featureIndex: number, coordIndex: number}>;
  private pathToEdit;

  constructor(
    httpService: HttpService,
    dataService: DataService,
    auth: AuthService,
    private spinner: SpinnerService,
    private alert: AlertService
  ) {
    super(httpService, dataService, auth);
  }


  public getOptions() {
    // Returns the options object - called from routes-create component
    return this.options;
  }



  public createRoute() {

    this.pathToEdit = this.dataService.getFromStore('activePath', false);
    this.activePoints = new ActivePoints();
    this.history = new PathHistory(this.pathToEdit);
    this.initialiseCreateMap(this.styleOptions);
    this.updateMap();

  }


  private updateMap() {

    this.activePoints.points = this.history.activePoints;
    console.log(this.activePoints.points);
    (this.tsMap.getSource('0000') as mapboxgl.GeoJSONSource).setData(this.history.activePath);
    (this.tsMap.getSource('points') as mapboxgl.GeoJSONSource).setData(this.activePoints.points);

    // console.log(this.activePoints.length, this.activePoints);
    if (this.activePoints.length >= 2) {
      this.dataService.activePathEmitter.emit(this.history.activePath);
      this.dataService.saveToStore('activePath', this.history.activePath);
    }
  }




  async simplify() {

    try {

      this.spinner.showAsElement();
      const backendResult = await this.getPathFromBackend(this.history.activePathCoords, {simplify: true});
      this.history.add(backendResult);
      this.updateMap();
      this.spinner.removeElement();

    } catch (error) {

      this.alert.showAsElement('something went wrong :(', error, true, false).subscribe( () => {});

    }
  }



  private getPathFromBackend(coords, options: {simplify: boolean} = {simplify: false}) {

    return new Promise<TsFeatureCollection>( (resolve, reject) => {

      this.httpService.getPathFromPoints(coords, options).subscribe( (result) => {
        resolve(result.hills);
      }, error => reject(error));

    });

  }



   /**
   * gets the coordinates for a given start and end point
   * handling the snapProfile in here is useful as it abstracts it from the calling functions
   */
  private getNextPathCoords(start: TsCoordinate, end: TsCoordinate) {

    return new Promise<Array<TsCoordinate>>( (resolve, reject) => {

      // if we dont need to get directions, just return the supplied coords as an array
      if (this.options.snapProfile === 'none') {
        resolve([start, end]);

      // otherwise, get coords from directions service
      } else {

        this.httpService.mapboxDirectionsQuery(this.options.snapProfile, start, end).subscribe( (result) => {

          if (result.code === 'Ok') {
            const coords = result.routes[0].geometry.coordinates.map( (c: TsPosition) => ({lat: c[1], lng: c[0]}) );
            resolve(coords);

          } else {
            reject('Mapbox directions query failed with error: ' + result.code);

          }
        });
      }
    });
  }



  public undo() {

    if (this.history.length === 1) {
      this.history = new PathHistory();
      this.updateMap();
    } else {
      this.history.undo();
      this.updateMap();
    }
  }




  public clearPath() {
    this.history = new PathHistory();
    this.updateMap();
  }




  public async closePath() {

    this.spinner.showAsElement();

    try {

      const newCoords = await this.getNextPathCoords(this.history.lastPoint, this.history.firstPoint);
      const backendResult = await this.getPathFromBackend(this.history.activePathCoords.concat(newCoords));
      this.history.add(backendResult);
      this.updateMap();

    } catch (error) {
      this.alert.showAsElement('something went wrong :(', error, true, false).subscribe( () => {});
    }

    this.spinner.removeElement();
  }





  kill() {
    this.activeLayers = {};
    this.removeMarkersFromMap();
  }




  initialiseCreateMap(lineStyleOptions) {

    this.tsMap.getCanvas().style.cursor = 'crosshair';

    // Put an empty line layer on the map
    this.tsMap.addLayer({
      id: '0000',
      type: 'line',
      source: {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      },
      paint: {
        'line-width': lineStyleOptions.lineWidth ? lineStyleOptions.lineWidth : ['get', 'lineWidth'],
        'line-color': lineStyleOptions.lineColour ? lineStyleOptions.lineColour : ['get', 'lineColour'],
        'line-opacity': lineStyleOptions.lineOpacity ? lineStyleOptions.lineOpacity : ['get', 'lineOpacity']
      }
    });

    // const data = { type: 'geojson', data: { type: 'FeatureCollection', features: [] }};
    this.tsMap.addSource('points', { type: 'geojson', data: { type: 'FeatureCollection', features: [] }} );

    // put an empty points layer on the map
    this.tsMap.addLayer({
      id: 'points',
      type: 'circle',
      source: 'points',
      paint: {
        'circle-radius': 4,
        'circle-opacity': 0.5,
        'circle-stroke-width': 1,
        'circle-stroke-color': 'black',
        'circle-color': [ 'case', ['boolean', ['feature-state', 'hover'], false ], 'black', 'white' ]
      }
    });

    this.tsMap.addLayer({
      id: 'symbols',
      type: 'symbol',
      source: 'points',
      filter: ['in', ['get', 'title'], ['literal', ['start', 'end']]],
      layout: {
        'symbol-placement': 'point',
        'text-anchor': 'bottom-left',
        'text-font': ['Open Sans Regular'],
        'text-field': '{title}', // part 2 of this is how to do it
        'text-size': 18
      }
    });

    this.tsMap.on('click', this.onClickGetCoords);
    this.tsMap.on('mousedown', 'points', this.onMouseDown);
    this.tsMap.on('mouseup', 'points', this.onMouseUp);
    this.tsMap.on('contextmenu', 'points', this.onRightClick);
    this.tsMap.on('mouseenter', 'points', this.onMouseEnter);
    this.tsMap.on('mouseleave', 'points', this.onMouseLeave);

  }


  /**
   *
   * Map event handlers
   *
   */


  private onClickGetCoords = async (e) => {

    // first ensure we didnt click on a point - if so assume we didnt want a new path segment and ignore click
    const isClickedOnPoint = this.tsMap.queryRenderedFeatures(e.point).some(point => point.source === 'points');
    if (!isClickedOnPoint) {

      this.spinner.showAsElement();
      const clickedPoint: TsCoordinate = { lat: e.lngLat.lat, lng: e.lngLat.lng };

      try {

        let newCoords: Array<TsCoordinate>;

        if (this.history.firstPoint) {

          newCoords = await this.getNextPathCoords(this.history.lastPoint, clickedPoint);
          const backendResult = await this.getPathFromBackend(this.history.activePathCoords.concat(newCoords));
          this.history.add(backendResult);

        } else {

          newCoords = await this.getNextPathCoords(clickedPoint, clickedPoint);
          this.history.firstPoint = newCoords[0];

        }

        this.updateMap();

      } catch (error) {
        this.alert.showAsElement('something went wrong :(', error, true, false).subscribe( () => {});
      }

      this.spinner.removeElement();
    }
  }


  // when the mouse move after being grabbed - set on by 'mousedown' event
  private onMove = (e) => {

    const coords: TsPosition = [e.lngLat.lng, e.lngLat.lat];
    this.tsMap.getCanvas().style.cursor = 'grabbing';
    this.activePoints.updatePoint(this.selectedPointId, coords);
    this.selectedLineIds.forEach( ids => this.history.updatePoint(ids.featureIndex, ids.coordIndex, coords) );

    (this.tsMap.getSource('points') as mapboxgl.GeoJSONSource).setData(this.activePoints.points);
    (this.tsMap.getSource('0000') as mapboxgl.GeoJSONSource).setData(this.history.activePath);

  }


  // when cursor enters a point, change cursor style and highlight the point
  private onMouseEnter = (e) => {
    this.selectedPointId = e.features[0].id;
    this.tsMap.getCanvas().style.cursor = 'pointer';
    this.tsMap.setFeatureState( {source: 'points', id: e.features[0].id}, {hover: true} );
  }


  // when cursor leaves a point, reset cursor style and remove highlighting
  private onMouseLeave = (e) => {
    this.tsMap.getCanvas().style.cursor = 'crosshair';
    this.tsMap.removeFeatureState( {source: 'points'} );
  }


  // Delete a point on right-click
  private onRightClick = async (e) => {

    this.spinner.showAsElement();

    try {

      const pathCoords = this.activePoints.coords;
      pathCoords.splice(<number>e.features[0].id, 1);
      const backendResult = await this.getPathFromBackend(pathCoords);
      this.history.add(backendResult);
      this.updateMap();
      this.tsMap.removeFeatureState( {source: 'points'} );

    } catch (error) {
      this.alert.showAsElement('something went wrong :(', error, true, false).subscribe( () => {});
    }

    this.spinner.removeElement();

  }


  // when mouse is clicked during hover event, grap the point and move with cursor
  private onMouseDown = (e) => {

    if (e.originalEvent.button === 0) { // only if its the left button

      this.selectedPointId = e.features[0].id;
      const pointCoords = this.activePoints.coordsAtIndex(this.selectedPointId);
      this.selectedLineIds = this.history.activePathMatchFeature(pointCoords);

      this.tsMap.off('mouseleave', 'points', this.onMouseLeave);
      this.tsMap.off('mouseenter', 'points', this.onMouseEnter);
      e.preventDefault();       // Prevent the default map drag behavior.

      this.tsMap.getCanvas().style.cursor = 'grab';
      this.tsMap.on('mousemove', this.onMove);
    }

  }


  // when mouse is released, get the new path from the backend (only active during drag event)
  private onMouseUp = async (e) => {

    if (e.originalEvent.button === 0) {

      this.tsMap.on('mouseleave', 'points', this.onMouseLeave);
      this.tsMap.on('mouseenter', 'points', this.onMouseEnter);
      this.tsMap.off('mousemove', this.onMove);

      this.tsMap.getCanvas().style.cursor = 'pointer';
      this.spinner.showAsElement();

      const coords = this.activePoints.coords;
      let newPath: TsFeatureCollection;

      const linesAfterPoint = async (point: number) => {
        let c: Array<TsCoordinate>;
        c = await this.getNextPathCoords(coords[point], coords[point + 1]);
        return c.concat( coords.slice(point + 1) );
      };

      const linesBeforePoint = async (point: number) => {
        let c: Array<TsCoordinate>;
        c = coords.slice(0, point - 1);
        return c.concat( await this.getNextPathCoords(coords[point - 1], coords[point]) );
      };

      try {

        if (this.options.snapProfile === 'none') {
          newPath = await this.getPathFromBackend(coords);

        } else {

          let newCoords: Array<TsCoordinate>;

          if (this.selectedPointId === 0) {                                 // first point
            newCoords = await linesAfterPoint(this.selectedPointId);
          } else if (this.selectedPointId === this.activePoints.length - 1) {   // last point
            newCoords = await linesBeforePoint(this.selectedPointId);
          } else {                                                          // any other point
            newCoords = (await linesBeforePoint(this.selectedPointId)).concat( await linesAfterPoint(this.selectedPointId) );
          }

          newPath = await this.getPathFromBackend(newCoords);

        }

      } catch (error) {
        this.alert.showAsElement('something went wrong :(', error, true, false).subscribe( () => {});
      }

      this.history.add(newPath);
      this.updateMap();
      this.spinner.removeElement();
      this.tsMap.removeFeatureState( {source: 'points'} );


    }

  }


}


