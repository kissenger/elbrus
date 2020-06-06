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

    this.activePoints = new ActivePoints();
    this.history = new PathHistory();
    this.initialiseCreateMap(this.styleOptions);

  }



  private onClickGetCoords = async (e) => {

    const isClickedOnPoint = this.tsMap.queryRenderedFeatures(e.point).some(point => point.source === 'points');

    if (!isClickedOnPoint) {

      this.spinner.showAsElement();
      const clickedPoint: TsCoordinate = { lat: e.lngLat.lat, lng: e.lngLat.lng };

      if (!this.history.isFirstPointSet) {
        // First click on map
        this.history.firstPoint = clickedPoint;
        this.updateMap();
        this.spinner.removeElement();

      } else {
        // subsequent loops: get path according to snap option, send to backend for missing elevations

        try {

          const newCoords = await this.getNextPathCoords(this.history.lastPoint, clickedPoint);
          const backendResult = await this.getPathFromBackend(this.history.activePathCoords.concat(newCoords));
          this.history.add(backendResult);
          this.updateMap();
          this.spinner.removeElement();

        } catch (error) {

          this.spinner.removeElement();
          this.alert.showAsElement('something went wrong :(', error, true, false).subscribe( () => {});

        }

      }
    }
  }



  private updateMap() {

    this.activePoints.points = this.history.activePoints;
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
      console.log('undo');
      this.history.undo();
      this.updateMap();
    } else {
      this.history.undo();
      this.updateMap();
    }
  }




  public clearPath() {
    // this.history.clear();
    // this.history.add(this.activePath.path);
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

    this.setMapEvents();

  }





  private setMapEvents() {


    let selectedPointId = null;
    let selectedLineIds = null;
    /**
     * Map events
     */
    this.tsMap.on('click', this.onClickGetCoords);

    const onMove = (e) => {
      const coords: TsPosition = [e.lngLat.lng, e.lngLat.lat];
      this.tsMap.getCanvas().style.cursor = 'grabbing';
      // this.activePoints.geometry.coordinates = coords;
      this.activePoints.updatePoint(selectedPointId, coords);

      // this.activePath.updateCoord(feat.featureIndex, feat.coordIndex, newPosition)
      selectedLineIds.forEach( ids => this.history.updatePoint(ids.featureIndex, ids.coordIndex, coords) );
      (this.tsMap.getSource('points') as mapboxgl.GeoJSONSource).setData(this.activePoints.points);
      (this.tsMap.getSource('0000') as mapboxgl.GeoJSONSource).setData(this.history.activePath);
    };




    // define leave behaviour
    const onMouseLeave = (e) => {
      this.tsMap.getCanvas().style.cursor = 'crosshair';
      this.tsMap.removeFeatureState( {source: 'points'} );
    };

    this.tsMap.on('mouseleave', 'points', onMouseLeave);

    // define enter behaviour
    const onMouseEnter = (e) => {
      selectedPointId = e.features[0].id;
      this.tsMap.getCanvas().style.cursor = 'pointer';
      this.tsMap.setFeatureState( {source: 'points', id: e.features[0].id}, {hover: true} );
    };

    this.tsMap.on('mouseenter', 'points', onMouseEnter);



    // returns the indices of the feature and coordinate in the line geoJSON for the selected point




    this.tsMap.on('mousedown', 'points', (e) => {

      if (e.originalEvent.button === 0) {
        // left button mouse-down

        console.log(this.activePoints);
        selectedPointId = e.features[0].id;
        const pointCoords = this.activePoints.coordsAtIndex[selectedPointId];
        console.log(selectedPointId, pointCoords);
        selectedLineIds = this.history.activePathMatchFeature(pointCoords);
        console.log(selectedLineIds);

        this.tsMap.off('mouseleave', 'points', onMouseLeave);
        this.tsMap.off('mouseenter', 'points', onMouseEnter);
        e.preventDefault();       // Prevent the default map drag behavior.

        this.tsMap.getCanvas().style.cursor = 'grab';
        this.tsMap.on('mousemove', onMove);
      }

    });



    /**
     * Delete current point on right-click
     */
    this.tsMap.on('contextmenu', 'points', async (e) => {

      this.spinner.showAsElement();

      try {

        selectedPointId = e.features[0].id;
        const pathCoords = this.activePoints.coords;
        pathCoords.splice(selectedPointId, 1);

        const backendResult = await this.getPathFromBackend(pathCoords);
        this.history.add(backendResult);
        this.updateMap();

      } catch (error) {
        this.alert.showAsElement('something went wrong :(', error, true, false).subscribe( () => {});
      }

      this.spinner.removeElement();

    });



    /**
     * Get path on mouse release
     *
     */
    this.tsMap.on('mouseup', 'points', async (e) => {

      if (e.originalEvent.button === 0) {

        console.log('mouseup');

        this.tsMap.on('mouseleave', 'points', onMouseLeave);
        this.tsMap.on('mouseenter', 'points', onMouseEnter);
        this.tsMap.off('mousemove', onMove);

        this.tsMap.getCanvas().style.cursor = 'pointer';

        const coords = this.activePoints.coords;
        let newPath: TsFeatureCollection;

        try {

          if (this.options.snapProfile === 'none') {
            newPath = await this.getPathFromBackend(coords);

          } else {
              const startPoint = <TsCoordinate>coords[selectedPointId - 1];
              const midPoint = <TsCoordinate>coords[selectedPointId];
              const endPoint = <TsCoordinate>coords[selectedPointId + 1];
              const segmentA = coords.slice(0, selectedPointId - 1);
              const segmentB = await this.getNextPathCoords(startPoint, midPoint);
              const segmentC = await this.getNextPathCoords(midPoint, endPoint);
              const segmentD = coords.slice(selectedPointId + 1);
              const newCoords = [...segmentA, ...segmentB, ...segmentC, ...segmentD];
              newPath = await this.getPathFromBackend(newCoords);

          }

        } catch (error) {
          this.alert.showAsElement('something went wrong :(', error, true, false).subscribe( () => {});
        }

        this.history.add(newPath);
        this.updateMap();
        this.spinner.removeElement();

      }

    });

  }



  getStartEndGeoJson() {

    return {
      type: 'FeatureCollection',
        features: [
          {
          type: 'Feature',
          properties: {
            description: 'start'
            },
          geometry: {
            type: 'Point',
            coordinates: this.history.firstPoint
          }
        },
        {
          type: 'Feature',
          properties: {
            description: 'end'
            },
          'geometry': {
            type: 'Point',
            coordinates: this.history.lastPoint
          }
        }
      ]
    };

  }

}
