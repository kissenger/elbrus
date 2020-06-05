import { Injectable } from '@angular/core';
import { MapService } from './map.service';
import { HttpService } from './http.service';
import { DataService } from './data.service';
import { TsCoordinate, TsPlotPathOptions, TsLineStyle, TsPosition, TsFeature, TsFeatureCollection } from 'src/app/shared/interfaces';
import { SpinnerService } from 'src/app/shared/services/spinner.service';
import { AuthService } from 'src/app/shared/services/auth.service';
import { PathHistory } from 'src/app/shared//classes/pathHistory';
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
  private activePath: TsFeatureCollection;
  private activePoints: TsFeatureCollection;


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

    this.history = new PathHistory();
    this.initialiseCreateMap(this.styleOptions);

    // this.mapCanvas = this.tsMap.getCanvasContainer();

  }



  onClickGetCoords = async (e) => {

    // console.log(this.tsMap.queryRenderedFeatures(e.point).some(point => point.source === 'points') );
        const isClickedOnPoint = this.tsMap.queryRenderedFeatures(e.point).some(point => point.source === 'points');
        // console.log(isClickedOnPoint);

        if (!isClickedOnPoint) {

          this.spinner.showAsElement();
          const clickedPoint: TsCoordinate = { lat: e.lngLat.lat, lng: e.lngLat.lng };

          if (!this.history.isFirstPointSet()) {
            // First click on map
            this.history.setFirstPoint(clickedPoint);
            this.addMarkerToMap(clickedPoint, '0000');
            this.spinner.removeElement();

          } else {
            // subsequent loops: get path according to snap option, send to backend for missing elevations

            // await this.getPath(this.history.lastPoint(), clickedPoint);
            try {

              const newCoords = await this.getNextPathCoords(this.history.lastPoint(), clickedPoint);
              const backendResult = await this.getPathFromBackend(this.history.coords().concat(newCoords));
              this.history.add(backendResult);
              this.activePath = backendResult;
              this.updateMap();
              this.spinner.removeElement();

            } catch (error) {

              this.spinner.removeElement();
              this.alert.showAsElement('Something went wrong :(', error.status + ': ' + error.error, true, false)
                .subscribe( () => {});

            }

          }
        }
      }



  private updateMap() {

    this.activePoints = this.getPointsGeoJson(this.activePath);
    (this.tsMap.getSource('0000') as mapboxgl.GeoJSONSource).setData(this.activePath);
    (this.tsMap.getSource('points') as mapboxgl.GeoJSONSource).setData(this.activePoints);

    this.dataService.activePathEmitter.emit(this.activePath);
    this.dataService.saveToStore('activePath', this.activePath);


  }


  async simplify() {

    try {
      this.spinner.showAsElement();
      const backendResult = await this.getPathFromBackend(this.history.coords(), {simplify: true});
      this.history.add(backendResult);
      this.activePath = backendResult;
      this.updateMap();
      this.spinner.removeElement();
    } catch (error) {
      console.log(error);
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
            const returnArray = [];
            result.routes[0].geometry.coordinates.forEach( (coord: GeoJSON.Position) => [
              returnArray.push({lat: coord[1], lng: coord[0]})
            ]);
            resolve(returnArray);

          } else {
            reject('Mapbox directions query failed with error: ' + result.code);
          }
        });
      }
    });
  }



  public undo() {
    if (this.history.length() === 1) {
      this.clearPath();
    } else {
      this.activePath = this.history.undo();
      this.updateMap();
    }
  }


  public clearPath() {
    this.history.add(this.activePath);
    this.activePath = { type: 'FeatureCollection', features: [] };
    this.updateMap();
  }



  public async closePath() {

    this.spinner.showAsElement();

    try {

      const newCoords = await this.getNextPathCoords(this.history.lastPoint(), this.history.firstPoint());
      const backendResult = await this.getPathFromBackend(this.history.coords().concat(newCoords));
      this.history.add(backendResult);
      this.activePath = backendResult;
      this.updateMap();
      this.spinner.removeElement();

    } catch (error) {

      this.spinner.removeElement();
      this.alert.showAsElement('Something went wrong :(', error.status + ': ' + error.error, true, false)
        .subscribe( () => {});

    }
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

    // put an empty points layer on the map
    this.tsMap.addLayer({
      id: 'points',
      type: 'circle',
      source: {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      },
      paint: {
        'circle-radius': 4,
        'circle-opacity': 1,
        'circle-stroke-width': 1,
        'circle-stroke-color': 'black',
        'circle-color': [ 'case', ['boolean', ['feature-state', 'hover'], false ], 'black', 'white' ]
      }
    });

    let selectedPointId = null;
    let selectedPointFeature = null;
    let selectedLineFeature = null;

    /**
     * Map events
     */
    this.tsMap.on('click', this.onClickGetCoords);

    const onMove = (e) => {
      const coords: TsPosition = [e.lngLat.lng, e.lngLat.lat];
      this.tsMap.getCanvas().style.cursor = 'grabbing';
      selectedPointFeature.geometry.coordinates = coords;
      selectedLineFeature.forEach( feat => {
        this.activePath.features[feat.featureIndex].geometry.coordinates[feat.coordIndex] = coords;
      });
      (this.tsMap.getSource('points') as mapboxgl.GeoJSONSource).setData(this.activePoints);
      (this.tsMap.getSource('0000') as mapboxgl.GeoJSONSource).setData(this.activePath);
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
    const getLineFeature = (pointCoord) => {

      const nFeatures = this.activePath.features.length;
      const stringyCoord = JSON.stringify(pointCoord);

      // for loops chosen as need access to indexes, and need to be able to jump out of loop
      for (let fi = 0; fi < nFeatures; fi++) {
        const nCoords = this.activePath.features[fi].geometry.coordinates.length;
        for (let ci = 0; ci < nCoords; ci++) {
          if (JSON.stringify(this.activePath.features[fi].geometry.coordinates[ci]) === stringyCoord) {
            const result = [{featureIndex: fi, coordIndex: ci}];
            if (fi !== nFeatures - 1 && ci === nCoords - 1) {
              result.push({featureIndex: fi + 1, coordIndex: 0});
            }
            return result;
          }
        }
      }
    };



    this.tsMap.on('mousedown', 'points', (e) => {

      if (e.originalEvent.button === 0) {
        // left button mouse-down

        selectedPointId = e.features[0].id;
        selectedPointFeature = this.activePoints.features.find( feature => parseInt(feature.id, 10) === selectedPointId );
        selectedLineFeature = getLineFeature(selectedPointFeature.geometry.coordinates);

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
        const pathCoords = this.activePoints.features
          .map(point => ({lat: point.geometry.coordinates[1], lng: point.geometry.coordinates[0]}));
        pathCoords.splice(selectedPointId, 1);

        const backendResult = await this.getPathFromBackend(pathCoords);
        this.history.add(backendResult);
        this.activePath = backendResult;
        this.updateMap();
        this.spinner.removeElement();

      } catch (error) {
        console.log(error);
      }





    });



    /**
     * Reset behaviours after point has moved
     */
    this.tsMap.on('mouseup', 'points', (e) => {

      if (e.originalEvent.button === 0) {

          console.log('mouseup');

          this.tsMap.on('mouseleave', 'points', onMouseLeave);
          this.tsMap.on('mouseenter', 'points', onMouseEnter);
          this.tsMap.off('mousemove', onMove);

          this.tsMap.getCanvas().style.cursor = 'pointer';

          this.history.add(this.activePath);
      }

    });






  }




  // addPointsLayer() {

    // const gj = this.getPointsGeoJson(geoJson);
    // console.log('####', gj.features.length);

  // }



}


  /**
   * Show points on map - used for debugging esp backend matching algorithms
   * Details on how to find the apprpriate factors here:
   *   https://stackoverflow.com/questions/37599561/drawing-a-circle-with-the-radius-in-miles-meters-with-mapbox-gl-js
   *   https://docs.mapbox.com/help/glossary/zoom-level/
   */





//   getPointsGeoJson(geoJson: TsFeatureCollection) {

//     const coordsArray = [];

//     // get list of coordinates from all features
//     geoJson.features.forEach( (feature, fIndex) => {
//       feature.geometry.coordinates.forEach( (coordinate, cIndex) => {
//         if (fIndex !== 0 && cIndex === 0 ) {
//           // prevents duplicating first point
//         } else {
//           coordsArray.push(coordinate);
//         }
//       });
//     });

//     // create features
//     const pointFeatures = coordsArray.map( (coord, index) => this.getPointFeature(coord) );

//     return this.getFeatureCollection(pointFeatures);

//   }

//   getFeatureCollection(features: Array<TsFeature>) {
//     return <TsFeatureCollection>{
//       type: 'FeatureCollection',
//       features: features
//     };
//   }

//   getPointFeature(point: TsPosition) {
//     return <TsFeature> {
//       type: 'Feature',
//       geometry: {
//         type: 'Point',
//         coordinates: point
//       }
//     }
//   );
//   }
// }
