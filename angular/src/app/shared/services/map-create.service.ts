import { Injectable } from '@angular/core';
import { MapService } from './map.service';
import { HttpService } from './http.service';
import { DataService } from './data.service';
import { TsLineStyle, TsPosition, TsFeatureCollection, TsSnapType, TsCoordinate } from 'src/app/shared/interfaces';
import { SpinnerService } from 'src/app/shared/services/spinner.service';
import { AuthService } from 'src/app/shared/services/auth.service';
import { PathHistory } from 'src/app/shared/classes/path-history';
import { AlertService } from './alert.service';
import { Path } from '../classes/path-class';
import { GeoJsonPipe } from 'src/app/shared/pipes/geojson.pipe';
import * as mapboxgl from 'mapbox-gl';
import { TsMarkers } from '../classes/ts-markers';

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
  private _snapType: TsSnapType = 'walking';
  private styleOptions: TsLineStyle = {};
  private selectedPointId: number;
  private selectedLineIds: Array<{featureIndex: number, coordIndex: number}>;
  private pathToEdit: TsFeatureCollection;
  private line: TsFeatureCollection;
  private points: TsFeatureCollection;
  private symbols: TsFeatureCollection;

  constructor(
    http: HttpService,
    data: DataService,
    auth: AuthService,
    geoJsonPipe: GeoJsonPipe,
    private spinner: SpinnerService,
    private alert: AlertService
  ) {
    super(http, data, auth, geoJsonPipe);
  }

  public get snapType() {
    return this._snapType;
  }

  public set snapType(newType: TsSnapType) {
    this._snapType = newType;
  }

  public createRoute() {

    this.pathToEdit = this.data.getPath();
    this.history = this.pathToEdit ? new PathHistory( new Path( this.pathToEdit ) ) : new PathHistory();
    this.markers = new TsMarkers();

    this.initialiseCreateMap(this.styleOptions);
    this.updateMap();

  }


  private updateMap() {

    // update the map with the last path in the history class
    this.tsMap.once('idle', (e) => {
      const geoJson = this.history.geoJson;
      this.data.setPath(geoJson);  // send regardless of whether geojson is valid, as a null will disable menu bar items
      if (this.isDev) { console.log(geoJson); }
    });

    // save the current line, points and symbols because...
    this.line = this.history.geojsonClone;
    this.points = this.history.activePoints;
    // this.symbols = this.history.startEndPoints;

    this.updateMapSource();

  }



  updateMapSource() {
    (this.tsMap.getSource('0000line') as mapboxgl.GeoJSONSource).setData(this.line);
    (this.tsMap.getSource('0000pts') as mapboxgl.GeoJSONSource).setData(this.points);

    // manage markers :(
    if (this.markers.exists('0000start')) {
      if (this.history.lastPath?.firstPoint) {
        this.markers.move('0000start', this.history.lastPath.firstPoint);
      }
    } else {
      if (this.history.firstPoint) {
        this.markers.add('0000start', 'start', this.history.firstPoint, this.tsMap);
      }
    }

    if (this.markers.exists('0000finish')) {
      this.markers.move('0000finish', this.history.lastPath.lastPoint );
    } else if (this.history.lastPath?.lastPoint) {
      this.markers.add('0000finish', 'finish', this.history.lastPath.lastPoint, this.tsMap);
    }

  }




  private getPathFromBackend(coords: Array<TsPosition>, options: {simplify: boolean} = {simplify: false}) {

    return new Promise<TsFeatureCollection>( (resolve, reject) => {
      this.http.getPathFromPoints(coords, options).subscribe(
        result => resolve(result.hills),
        error => reject(error)
      );
    });

  }



   /**
   * gets the coordinates for a given start and end point
   * handling the _snapType in here is useful as it abstracts it from the calling functions
   */
  private getNextPathCoords(start: TsPosition, end: TsPosition) {

    return new Promise<Array<TsPosition>>( (resolve, reject) => {

      // if we dont need to get directions, just return the supplied coords as an array
      if (this._snapType === 'none') {
        resolve([start, end]);

      // otherwise, get coords from directions service
      } else {

        this.http.mapboxDirectionsQuery(this._snapType, start, end).subscribe( (result) => {

          if (result.code === 'Ok') {

            resolve(result.routes[0].geometry.coordinates);

          } else {

            reject('Mapbox directions query failed with error: ' + result.code);

          }
        });
      }
    });
  }





  public undo() {

    if ( !this.history.undo() ) {
      this.alert.showAsElement('Warning', 'No more to undo ...', true, false).subscribe( () => {});
    }

    this.updateMap();

  }




  public clear() {

    this.alert.showAsElement('Are you sure?', 'This action cannot be undone...', true, true)
      .subscribe( (alertBoxResponse: boolean) => {

      if (alertBoxResponse) {
        this.history.clear();
        this.updateMap();
      }

    });

  }


  public async reversePath() {

    const reversedCoords = this.history.coords.map( (c, i, arr) => arr[this.history.nPoints - i - 1]);
    const backendResult = await this.getPathFromBackend( reversedCoords );
    this.history.add( new Path(backendResult) );
    this.updateMap();

  }


  async simplify() {

    try {

      this.spinner.showAsElement();
      const backendResult = await this.getPathFromBackend(this.history.coords, {simplify: true});
      this.history.add( new Path( backendResult ) );
      this.updateMap();
      this.spinner.removeElement();

    } catch (error) {

    }
  }



  public async closePath() {

    this.spinner.showAsElement();

    try {

      const newCoords = await this.getNextPathCoords(this.history.lastPoint, this.history.firstPoint);
      newCoords.splice(0, 1);
      const backendResult = await this.getPathFromBackend(this.history.coords.concat(newCoords));
      this.history.add( new Path(backendResult) );
      this.updateMap();

    } catch (error) {
    }

    this.spinner.removeElement();
  }



  initialiseCreateMap(lineStyleOptions) {

    this.tsMap.getCanvas().style.cursor = 'crosshair';

    this.addLineLayer('0000line', lineStyleOptions );
    this.addPointsLayer('0000pts', {
        'circle-radius': 4,
        'circle-opacity': 0.3,
        'circle-stroke-width': 1,
        'circle-color':
          [ 'case',
            ['boolean', ['feature-state', 'enabled'], false ],
            'blue',
            ['boolean', ['feature-state', 'hover'], false ],
            'black',
            'white'
          ]
      });

    // this.addSymbolLayer('0000sym');

    this.tsMap.on('click', this.onClickGetCoords);
    this.tsMap.on('mousedown', '0000pts', this.onMouseDown);
    this.tsMap.on('mouseup', '0000pts', this.onMouseUp);
    this.tsMap.on('contextmenu', '0000pts', this.onRightClick);
    this.tsMap.on('mouseenter', '0000pts', this.onMouseEnter);
    this.tsMap.on('mouseleave', '0000pts', this.onMouseLeave);

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
      const clickedPoint: TsPosition = [e.lngLat.lng, e.lngLat.lat];

      try {

        if (this.history.firstPoint) {

          const newCoords = await this.getNextPathCoords(this.history.lastPoint, clickedPoint);
          newCoords.splice(0, 1);
          const backendResult = await this.getPathFromBackend(this.history.coords.concat(newCoords));
          this.history.add( new Path(backendResult) );

        } else {

          const newCoords = await this.getNextPathCoords(clickedPoint, clickedPoint);
          this.history.firstPoint = newCoords[0];

        }

        this.updateMap();

      } catch (error) {

      }

      this.spinner.removeElement();
    }
  }


  // when the mouse move after being grabbed - set on by 'mousedown' event
  private onMove = (e: mapboxgl.MapLayerMouseEvent) => {

    const coords: TsPosition = [e.lngLat.lng, e.lngLat.lat];
    this.points.features[this.selectedPointId].geometry.coordinates = coords;

    if (this.selectedLineIds) {
      // if there is a line plotted to move (ie not just the first point)
      this.selectedLineIds.forEach( ids => this.line.features[ids.featureIndex].geometry.coordinates[ids.coordIndex] = coords );
    }

    if (this.selectedPointId === 0 || this.selectedPointId === this.points.features.length - 1) {
      this.symbols.features[this.selectedPointId === 0 ? 0 : 1].geometry.coordinates = coords;
    }

    this.updateMapSource();

  }


  // when cursor enters a point, change cursor style and highlight the point
  private onMouseEnter = (e: mapboxgl.MapLayerMouseEvent) => {
    this.selectedPointId = <number>e.features[0].id;
    this.tsMap.getCanvas().style.cursor = 'pointer';
    this.tsMap.setFeatureState( {source: '0000pts', id: e.features[0].id}, {hover: true} );
  }


  // when cursor leaves a point, reset cursor style and remove highlighting
  private onMouseLeave = (e: mapboxgl.MapLayerMouseEvent) => {
    this.tsMap.getCanvas().style.cursor = 'crosshair';
    this.tsMap.removeFeatureState( {source: '0000pts'} );
  }


  // Delete a point on right-click
  private onRightClick = async (e: mapboxgl.MapLayerMouseEvent) => {

    this.spinner.showAsElement();

    try {

      const pathCoords = this.history.coords;
      pathCoords.splice(<number>e.features[0].id, 1);
      const backendResult = await this.getPathFromBackend(pathCoords);
      this.history.add( new Path (backendResult) );
      this.updateMap();
      this.tsMap.removeFeatureState( {source: '0000pts'} );

    } catch (error) {

    }

    this.spinner.removeElement();

  }


  // when mouse is clicked during hover event, grap the point and move with cursor
  private onMouseDown = (e: mapboxgl.MapLayerMouseEvent) => {

    if (e.originalEvent.button === 0) { // only if its the left button
      this.selectedPointId = <number>e.features[0].id;
      const pointCoords = this.history.coordsAtIndex(this.selectedPointId);
      this.selectedLineIds = this.history.matchFeature(pointCoords);

      this.tsMap.off('mouseleave', '0000pts', this.onMouseLeave);
      this.tsMap.off('mouseenter', '0000pts', this.onMouseEnter);
      e.preventDefault();       // Prevent the default map drag behavior.

      // this.tsMap.getCanvas().style.cursor = 'grab';
      this.tsMap.getCanvas().style.cursor = 'grabbing';
      this.tsMap.on('mousemove', this.onMove);
    }

  }


  // when mouse is released, get the new path from the backend (only active during drag event)
  private onMouseUp = async (e: mapboxgl.MapLayerMouseEvent) => {

    if (e.originalEvent.button === 0) {

      this.tsMap.on('mouseleave', '0000pts', this.onMouseLeave);
      this.tsMap.on('mouseenter', '0000pts', this.onMouseEnter);
      this.tsMap.off('mousemove', this.onMove);

      this.tsMap.getCanvas().style.cursor = 'pointer';


      if (this.selectedLineIds) {
        // we moved some lines

        this.spinner.showAsElement();
        const coords = this.history.coords;
        let backendResult: TsFeatureCollection;

        const linesAfterPoint = async (point: number) => {
          let c: Array<TsPosition>;
          c = await this.getNextPathCoords([e.lngLat.lng, e.lngLat.lat], coords[point + 1]);
          return c.concat( coords.slice(point + 1) );
        };

        const linesBeforePoint = async (point: number) => {
          let c: Array<TsPosition>;
          c = coords.slice(0, point - 1);
          return c.concat( await this.getNextPathCoords(coords[point - 1], [e.lngLat.lng, e.lngLat.lat]) );
        };

        try {

          if (this._snapType === 'none') {
            backendResult = await this.getPathFromBackend(coords);

          } else {

            let newCoords: Array<TsPosition>;

            if (this.selectedPointId === 0) {                                 // first point
              newCoords = await linesAfterPoint(this.selectedPointId);
            } else if (this.selectedPointId === this.history.coords.length - 1) {   // last point
              newCoords = await linesBeforePoint(this.selectedPointId);
            } else {                                                          // any other point
              newCoords = (await linesBeforePoint(this.selectedPointId)).concat( await linesAfterPoint(this.selectedPointId) );
            }

            backendResult = await this.getPathFromBackend(newCoords);

          }

        } catch (error) {

        }

        this.history.add( new Path(backendResult) );
        this.updateMap();
        this.spinner.removeElement();
        this.tsMap.removeFeatureState( {source: '0000pts'} );
      } else {
        // we only moved the first point

        this.history.firstPoint = [e.lngLat.lng, e.lngLat.lat];

      }

    }

  }


}


