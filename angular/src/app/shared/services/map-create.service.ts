import { ScreenSizeService } from './screen-size.service';
import { Injectable } from '@angular/core';
import { MapService } from './map.service';
import { HttpService } from './http.service';
import { DataService } from './data.service';
import { TsLineStyle, TsPosition, TsFeatureCollection, TsSnapType } from 'src/app/shared/interfaces';
import { SpinnerService } from 'src/app/shared/services/spinner.service';
import { AuthService } from 'src/app/shared/services/auth.service';
import { PathHistory } from 'src/app/shared/classes/path-history';
import { AlertService } from './alert.service';
import { Path } from '../classes/path-class';
import { GeoJsonPipe } from 'src/app/shared/pipes/geojson.pipe';
import * as mapboxgl from 'mapbox-gl';
import { TsMarkers } from '../classes/ts-markers';
import { UnitsStringPipe } from '../pipes/units-string.pipe';

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
  // private popup: mapboxgl.Popup;
  private pathId: string;

  constructor(
    http: HttpService,
    data: DataService,
    auth: AuthService,
    geoJsonPipe: GeoJsonPipe,
    unitsStringPipe: UnitsStringPipe,
    screenSize: ScreenSizeService,
    private spinner: SpinnerService,
    private alert: AlertService,
  ) {
    super(http, data, auth, geoJsonPipe, unitsStringPipe, screenSize);
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
      if (this.pathToEdit) {
        geoJson.properties.info.name = this.pathToEdit.properties.info.name;
        geoJson.properties.info.description = this.pathToEdit.properties.info.description;
        geoJson.properties.pathId = this.pathToEdit.properties.pathId;
        this.pathId = this.pathToEdit.properties.pathId;
      }
      this.data.setPath(geoJson);  // send regardless of whether geojson is valid, as a null will disable menu bar items
      if (this.isDev) { console.log(geoJson); }
    });

    // save the current line, points because...
    this.line = this.history.geojsonClone;
    this.points = this.history.activePoints;

    this.updateMapSource();

  }



  updateMapSource() {
    (this.tsMap.getSource('0000line') as mapboxgl.GeoJSONSource).setData(this.line);
    (this.tsMap.getSource('0000pts') as mapboxgl.GeoJSONSource).setData(this.points);

    // manage markers :(
    if (this.markers.exists('0000start')) {
      if (!this.history.firstPoint) {
        this.markers.delete('0000start');
      } else {
        if (this.history.lastPath) {
          this.markers.move('0000start', this.history.lastPath.firstPoint );
        }

      }
    } else {
      if (this.history.firstPoint) {
        this.markers.add('0000start', 'start', this.history.firstPoint, this.tsMap);
      }
    }

    if (this.markers.exists('0000finish')) {
      if (this.history.lastPath) {
        this.markers.move('0000finish', this.history.lastPath.lastPoint );
      } else {
        this.markers.delete('0000finish');
      }
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
        this.data.clearPath();
      }

    });

  }


  public async reversePath() {

    const reversedCoords = this.history.coords.map( (c, i, arr) => arr[this.history.nPoints - i - 1]);
    const fromBackend = await this.getPathFromBackend( reversedCoords );
    this.history.add( new Path(fromBackend) );
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
    this.tsMap.on('contextmenu', '0000pts', this.onRightClickEdit);
    this.tsMap.on('mouseenter', '0000pts', this.onMouseEnter);
    this.tsMap.on('mouseleave', '0000pts', this.onMouseLeave);
    this.tsMap.on('mousedown', () => {
      this.tsMap.getCanvas().style.cursor = 'grabbing';
    });
    this.tsMap.on('mouseup', () => {
      this.tsMap.getCanvas().style.cursor = 'crosshair';
    });
  }


  /**
   *
   * Map event handlers
   *
   */


  private onClickGetCoords = async (e) => {

    // do nothing if popup is active
    if (this.mouseoverPopup) {
      this.mouseoverPopup = null;
      return;
    }

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
      this.selectedLineIds.forEach( ids => this.line.features[ids.featureIndex].geometry.coordinates[ids.coordIndex] = coords );
    }

    this.updateMapSource();

  }


  // when cursor enters a point, change cursor style and highlight the point
  private onMouseEnter = (e: mapboxgl.MapLayerMouseEvent) => {
    this.selectedPointId = <number>e.features[0].id;
    this.tsMap.getCanvas().style.cursor = 'pointer';
    this.tsMap.setFeatureState( {source: '0000pts', id: e.features[0].id}, {hover: true} );
    this.tsMap.off('contextmenu', this.onRightClick);
  }


  // when cursor leaves a point, reset cursor style and remove highlighting
  private onMouseLeave = (e: mapboxgl.MapLayerMouseEvent) => {
    this.tsMap.getCanvas().style.cursor = 'crosshair';
    this.tsMap.removeFeatureState( {source: '0000pts'} );
    this.tsMap.on('contextmenu', this.onRightClick);
  }


  // Show menu on right-click
  private onRightClickEdit = async (e: mapboxgl.MapLayerMouseEvent) => {

    if (this.mouseoverPopup) {
      this.mouseoverPopup.remove();
      this.mouseoverPopup = null;
    }



    const pathCoords = JSON.parse(JSON.stringify(this.history.coords));
    const pointId = <number>e.features[0].id;
    const latLngString = `${pathCoords[pointId][1]},${pathCoords[pointId][0]}`;
    const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${latLngString}`;
    const osMapsLink = `https://osmaps.ordnancesurvey.co.uk/${latLngString},16/pin`;

    const html = `
      <div class="menu-item" id="delete-point" style="padding-left:3px">Delete point</div>
      ${pointId > 0 ?                     '<div class="menu-item" id="delete-points-before" style="padding-left:3px">Delete all points before</div>' : ''}
      ${pointId < pathCoords.length - 1 ? '<div class="menu-item" id="delete-points-after" style="padding-left:3px">Delete all points after</div>' : ''}
      ${pointId > 0 ?                     '<div class="menu-item" id="add-point-before" style="padding-left:3px">Add point before</div>' : ''}
      ${pointId < pathCoords.length - 1 ? '<div class="menu-item" id="add-point-after" style="padding-left:3px">Add point after</div>' : ''}
      <div style="padding-left:3px">
        Show point in <a href="${googleMapsLink}" target="_blank"> google maps</a> | <a href="${osMapsLink}" target="_blank">OS maps</a>
      </div>
    `;

    // store on the class so other functions can know if popup exists or not
    this.mouseoverPopup = new mapboxgl.Popup({ closeOnClick: true })
      .setLngLat(e.lngLat)
      .setHTML(html)
      .addTo(this.tsMap);

    // add event listener to simulate hover effect
    Array.from(document.getElementsByClassName('menu-item')).forEach( item => {
      item.addEventListener('mouseover', (a) => {
        a.target['style'].backgroundColor = '#F5F5F5';
        a.target['style'].cursor = 'pointer';
      });
      item.addEventListener('mouseout', (a) => {
        a.target['style'].backgroundColor = 'white';
      });
    });

    document.getElementById('delete-point').addEventListener('click', async () => {
      pathCoords.splice(pointId, 1);
      processNewPoints(pathCoords);
    });

    document.getElementById('add-point-before')?.addEventListener('click', async () => {
      // rounding is done to 4pd to introduce small error, which prevents new point being simplified out
      const newLng = Math.ceil((pathCoords[pointId - 1][0] + pathCoords[pointId][0]) / 2 * 1E4) / 1E4;
      const newLat = Math.ceil((pathCoords[pointId - 1][1] + pathCoords[pointId][1]) / 2 * 1E4) / 1E4;
      pathCoords.splice(pointId, 0, [newLng, newLat]);
      processNewPoints(pathCoords);
    });

    document.getElementById('add-point-after')?.addEventListener('click', async () => {
      // rounding is done to 4pd to introduce small error, which prevents new point being simplified out
      const newLng = Math.ceil((pathCoords[pointId + 1][0] + pathCoords[pointId][0]) / 2 * 1E4) / 1E4;
      const newLat = Math.ceil((pathCoords[pointId + 1][1] + pathCoords[pointId][1]) / 2 * 1E4) / 1E4;
      pathCoords.splice(pointId + 1, 0, [newLng, newLat]);
      processNewPoints(pathCoords);
    });

    document.getElementById('delete-points-before')?.addEventListener('click', async () => {
      pathCoords.splice(0, pointId);
      processNewPoints(pathCoords);
    });

    document.getElementById('delete-points-after')?.addEventListener('click', async () => {
      pathCoords.splice(pointId + 1, pathCoords.length - pointId);
      processNewPoints(pathCoords);
    });

    document.getElementById('add-checkpoint')?.addEventListener('click', async () => {
      console.log('add-checkpoint');
      this.http.addRemoveCheckpoint(this.pathId, pathCoords.splice(pointId, 1), 'add').subscribe(
        result => console.log(result),
        error => console.log(error)
      );
    });

    const processNewPoints = async(coords: Array<TsPosition>) => {
      const backendResult = await this.getPathFromBackend(coords);
      this.history.add( new Path (backendResult) );
      this.updateMap();
      this.tsMap.removeFeatureState( {source: '0000pts'} );
      this.mouseoverPopup.remove();
      this.mouseoverPopup = null;
    };
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

            const newCoords = this.points.features.map(f => f.geometry.coordinates);
            backendResult = await this.getPathFromBackend(<Array<TsPosition>>newCoords);

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


