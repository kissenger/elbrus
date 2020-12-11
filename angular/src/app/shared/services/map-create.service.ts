import { Injectable } from '@angular/core';
import { MapService } from './map.service';
import { HttpService } from './http.service';
import { DataService } from './data.service';
import { TsCoordinate, TsPlotPathOptions, TsLineStyle, TsPosition, TsFeature, TsFeatureCollection } from 'src/app/shared/interfaces';
import { SpinnerService } from 'src/app/shared/services/spinner.service';
import { AuthService } from 'src/app/shared/services/auth.service';
import { PathHistory } from 'src/app/shared/classes/path-history';
import { AlertService } from './alert.service';
import { Path } from '../classes/path-class';
import { GeoJsonPipe } from 'src/app/shared/pipes/geojson.pipe';
import * as mapboxgl from 'mapbox-gl';
// import { mapboxgl } from ''

@Injectable({
  providedIn: 'root'
})

/**
 * A child of the MapService, MapCreateService provides the functions to create a new route on the map
 * Seems to get instantiated when the map loads, possibly because create map is a child of map?  Bit of
 * a benign bug - need to ensure if a create route is cancelled, we clear history as class is not reinstantiated
 */
export class MapCreateService extends MapService {
// export class MapCreateService {

  private history: PathHistory;
  private _options = { snapProfile: 'driving' };
  private plotOptions: TsPlotPathOptions = {
    booResizeView: false,
    booSaveToStore: true,
    booPlotPoints: true
  };
  private styleOptions: TsLineStyle = {};
  private selectedPointId: number;
  private selectedLineIds: Array<{featureIndex: number, coordIndex: number}>;
  private pathToEdit: TsFeatureCollection;
  private pathName: string;
  private pathDescription: string;
  private activePathClone: TsFeatureCollection;

  // keeping the active layers on the class helps with responsiveness when moving (editing) a point
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


  public set options(optionKey: string) {
    // sets snap behaviours - called from routes-create component
    this._options.snapProfile = optionKey;

  }



  public createRoute() {

    this.pathToEdit = this.data.get('activePath');
    this._options.snapProfile = 'driving';
    if ( this.pathToEdit ) {
      this.history = new PathHistory( new Path( this.pathToEdit ) );
    } else {
      this.history = new PathHistory();
    }
    this.initialiseCreateMap(this.styleOptions);
    this.updateMap();

  }


  private updateMap() {

    this.tsMap.once('idle', (e) => {
      // if (this.history.length > 0) { this.data.setPath(this.history.fullGeo, true); }
      // emit the full geoJson to enable properties to be displayed in details
      if (this.history.length === 0) {
        this.data.setPath(null);
      } else {

        this.data.setPath(this.history.geoJson);

      }
    });

    this.line = this.history.geojsonClone;
    this.points = this.history.activePoints;
    this.symbols = this.history.startEndPoints;

    this.updateMapSource();

  }



  updateMapSource() {
    (this.tsMap.getSource('0000line') as mapboxgl.GeoJSONSource).setData(this.line);
    (this.tsMap.getSource('0000pts') as mapboxgl.GeoJSONSource).setData(this.points);
    (this.tsMap.getSource('0000sym') as mapboxgl.GeoJSONSource).setData(this.symbols);
  }




  private getPathFromBackend(coords: Array<TsCoordinate>, options: {simplify: boolean} = {simplify: false}) {

    return new Promise<TsFeatureCollection>( (resolve, reject) => {

      this.http.getPathFromPoints(coords, options).subscribe( (result) => {
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
      if (this._options.snapProfile === 'none') {
        resolve([start, end]);

      // otherwise, get coords from directions service
      } else {

        this.http.mapboxDirectionsQuery(this._options.snapProfile, start, end).subscribe( (result) => {

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

    if ( !this.history.undo() ) {
      this.alert.showAsElement('Warning', 'No more to undo ...', true, false).subscribe( () => {});
    }

    this.updateMap();

  }




  public clear() {

    console.log('how confusing');

    this.alert.showAsElement('Are you sure?', 'This action cannot be undone...', true, true)
      .subscribe( (alertBoxResponse: boolean) => {

      if (alertBoxResponse) {
        this.history.clear();
        this.updateMap();
      }

    });

  }


  public async reversePath() {

    const n = this.history.nPoints;
    const revCoords = this.history.coords.map( (c, i, arr) => arr[n - i - 1]);
    const backendResult = await this.getPathFromBackend( revCoords );
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

      console.log(error);
      this.alert.showAsElement(`${error.name}: ${error.name} `, error.message, true, false).subscribe( () => {});

    }
  }



  public async closePath() {

    this.spinner.showAsElement();

    try {

      const newCoords = await this.getNextPathCoords(this.history.lastPoint, this.history.firstPoint);
      const backendResult = await this.getPathFromBackend(this.history.coords.concat(newCoords));
      this.history.add( new Path(backendResult) );
      this.updateMap();

    } catch (error) {
      console.log(error);
      this.alert.showAsElement(`${error.name}: ${error.name} `, error.message, true, false).subscribe( () => {});
    }

    this.spinner.removeElement();
  }



  initialiseCreateMap(lineStyleOptions) {

    this.tsMap.getCanvas().style.cursor = 'crosshair';

    this.addLineLayer('0000line', lineStyleOptions );
    this.addPointsLayer('0000pts', {
        'circle-radius': 8,
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

    this.addSymbolLayer('0000sym');

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
      const clickedPoint: TsCoordinate = { lat: e.lngLat.lat, lng: e.lngLat.lng };

      try {

        if (this.history.firstPoint) {

          const newCoords = await this.getNextPathCoords(this.history.lastPoint, clickedPoint);
          const backendResult = await this.getPathFromBackend(this.history.coords.concat(newCoords));
          this.history.add( new Path(backendResult) );

        } else {

          const newCoords = await this.getNextPathCoords(clickedPoint, clickedPoint);
          this.history.firstPoint = newCoords[0];

        }

        this.updateMap();

      } catch (error) {
        console.log(error);
        this.alert.showAsElement(`${error.name}: ${error.name} `, error.message, true, false).subscribe( () => {});
      }

      this.spinner.removeElement();
    }
  }


  // when the mouse move after being grabbed - set on by 'mousedown' event
  private onMove = (e) => {

    const coords: TsPosition = [e.lngLat.lng, e.lngLat.lat];

    this.points.features[this.selectedPointId].geometry.coordinates = coords;
    this.selectedLineIds.forEach( ids => this.line.features[ids.featureIndex].geometry.coordinates[ids.coordIndex] = coords );
    if (this.selectedPointId === 0 || this.selectedPointId === this.points.features.length - 1) {
      this.symbols.features[this.selectedPointId === 0 ? 0 : 1].geometry.coordinates = coords;
    }

    this.updateMapSource();

  }


  // when cursor enters a point, change cursor style and highlight the point
  private onMouseEnter = (e) => {
    this.selectedPointId = e.features[0].id;
    this.tsMap.getCanvas().style.cursor = 'pointer';
    this.tsMap.setFeatureState( {source: '0000pts', id: e.features[0].id}, {hover: true} );
  }


  // when cursor leaves a point, reset cursor style and remove highlighting
  private onMouseLeave = (e) => {
    this.tsMap.getCanvas().style.cursor = 'crosshair';
    this.tsMap.removeFeatureState( {source: '0000pts'} );
  }


  // Delete a point on right-click
  private onRightClick = async (e) => {

    this.spinner.showAsElement();

    try {

      const pathCoords = this.history.coords;
      pathCoords.splice(<number>e.features[0].id, 1);
      const backendResult = await this.getPathFromBackend(pathCoords);
      this.history.add( new Path (backendResult) );
      this.updateMap();
      this.tsMap.removeFeatureState( {source: '0000pts'} );

    } catch (error) {
      console.log(error);
      this.alert.showAsElement(`${error.name}: ${error.name} `, error.message, true, false).subscribe( () => {});
    }

    this.spinner.removeElement();

  }


  // when mouse is clicked during hover event, grap the point and move with cursor
  private onMouseDown = (e) => {

    if (e.originalEvent.button === 0) { // only if its the left button

      this.selectedPointId = e.features[0].id;
      const pointCoords = this.history.coordsAtIndex(this.selectedPointId);
      this.selectedLineIds = this.history.matchFeature(pointCoords);
      // this.activePathClone = this.history.simpleGeo; // this enables the moving points to not affect the undo history

      this.tsMap.off('mouseleave', '0000pts', this.onMouseLeave);
      this.tsMap.off('mouseenter', '0000pts', this.onMouseEnter);
      e.preventDefault();       // Prevent the default map drag behavior.

      // this.tsMap.getCanvas().style.cursor = 'grab';
      this.tsMap.getCanvas().style.cursor = 'grabbing';
      this.tsMap.on('mousemove', this.onMove);
    }

  }


  // when mouse is released, get the new path from the backend (only active during drag event)
  private onMouseUp = async (e) => {

    if (e.originalEvent.button === 0) {

      this.tsMap.on('mouseleave', '0000pts', this.onMouseLeave);
      this.tsMap.on('mouseenter', '0000pts', this.onMouseEnter);
      this.tsMap.off('mousemove', this.onMove);

      this.tsMap.getCanvas().style.cursor = 'pointer';
      this.spinner.showAsElement();

      const coords = this.history.coords;
      let backendResult: TsFeatureCollection;

      const linesAfterPoint = async (point: number) => {
        let c: Array<TsCoordinate>;
        c = await this.getNextPathCoords(e.lngLat, coords[point + 1]);
        return c.concat( coords.slice(point + 1) );
      };

      const linesBeforePoint = async (point: number) => {
        let c: Array<TsCoordinate>;
        c = coords.slice(0, point - 1);
        return c.concat( await this.getNextPathCoords(coords[point - 1], e.lngLat) );
      };

      try {

        if (this._options.snapProfile === 'none') {
          backendResult = await this.getPathFromBackend(coords);

        } else {

          let newCoords: Array<TsCoordinate>;

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
        console.log(error);
        this.alert.showAsElement(`${error.name}: ${error.name} `, error.message, true, false).subscribe( () => {});
      }

      this.history.add( new Path(backendResult) );
      this.updateMap();
      this.spinner.removeElement();
      this.tsMap.removeFeatureState( {source: '0000pts'} );

    }

  }


}


