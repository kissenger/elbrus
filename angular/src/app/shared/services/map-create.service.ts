import { Injectable } from '@angular/core';
import { MapService } from './map.service';
import { HttpService } from './http.service';
import { DataService } from './data.service';
import { TsCoordinate, TsPlotPathOptions, TsLineStyle, TsPosition, TsFeature, TsFeatureCollection } from 'src/app/shared/interfaces';
import { SpinnerService } from 'src/app/shared/services/spinner.service';
import { AuthService } from 'src/app/shared/services/auth.service';
import { PathHistory } from 'src/app/shared//classes/pathHistory';
import { AlertService } from './alert.service';
import { Icu } from '@angular/compiler/src/i18n/i18n_ast';

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

  private updateMap() {


    this.activePath = this.history.geoJson();
    this.activePoints = this.getPointsGeoJson(this.activePath);

    // this.addPathToMap(this.activePath, this.styleOptions, this.plotOptions);
    (this.tsMap.getSource('0000') as mapboxgl.GeoJSONSource).setData(this.activePath);
    (this.tsMap.getSource('points') as mapboxgl.GeoJSONSource).setData(this.activePoints);
    // this.addPointsLayer(geoJson);\

  }



  private getPath(start: TsCoordinate, end: TsCoordinate) {

    return new Promise( async (resolve, reject) => {

      try {
        const newCoords = await this.getNextPathCoords(start, end);
        this.httpService.getPathFromPoints(this.history.coords().concat(newCoords)).subscribe( (result) => {
          this.history.add(result.hills);
          this.updateMap();
          resolve();
        });
      } catch (error) {
        reject(error);
      }

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
      this.history.undo();
      this.removePathFromMap('0000');
      this.addPathToMap(this.history.geoJson(), this.styleOptions, this.plotOptions);
    }
  }


  public clearPath() {
    this.removePathFromMap('0000');
    // this.removeMarkersFromMap();
    this.history = new PathHistory();
  }


  public async closePath() {

    this.spinner.showAsElement();
    try {
      await this.getPath(this.history.lastPoint(), this.history.firstPoint());
      this.spinner.removeElement();
      this.updateMap();
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
      const coords = e.lngLat;
      this.tsMap.getCanvas().style.cursor = 'grabbing';
      selectedPointFeature.geometry.coordinates = [coords.lng, coords.lat];
      (this.tsMap.getSource('points') as mapboxgl.GeoJSONSource).setData(this.activePoints);
    };


    // define leave behaviour
    const onMouseLeave = (e) => {
      this.tsMap.getCanvas().style.cursor = 'crosshair';
      this.tsMap.removeFeatureState( {source: 'points', id: selectedPointId} );
    };

    this.tsMap.on('mouseleave', 'points', onMouseLeave);

    // define enter behaviour
    const onMouseEnter = (e) => {
      selectedPointId = e.features[0].id;
      this.tsMap.getCanvas().style.cursor = 'pointer';
      this.tsMap.setFeatureState( {source: 'points', id: e.features[0].id}, {hover: true} );
    };

    this.tsMap.on('mouseenter', 'points', onMouseEnter);

    const getLineFeature = (pointCoord) => {
      console.log('++++', pointCoord);
      const stringyCoord = JSON.stringify(pointCoord);
      this.activePath.features.forEach( (feature, featureIndex) => {
        feature.geometry.coordinates.forEach( (coord, coordIndex) => {
          console.log(JSON.stringify(coord), stringyCoord);
          if (JSON.stringify(coord) === stringyCoord) {
            return {featureIndex, coordIndex };
          }
        });
      });
    };

    this.tsMap.on('mousedown', 'points', (e) => {

      selectedPointId = e.features[0].id;
      selectedPointFeature = this.activePoints.features.find( feature => parseInt(feature.id, 10) === selectedPointId );
      selectedLineFeature = getLineFeature(selectedPointFeature.geometry.coordinates);
      console.log(selectedLineFeature);

      // turn off enter and leave events - we no longer want to interact with points
      this.tsMap.off('mouseleave', 'points', onMouseLeave);
      this.tsMap.off('mouseenter', 'points', onMouseEnter);
      e.preventDefault();       // Prevent the default map drag behavior.

      this.tsMap.getCanvas().style.cursor = 'grab';
      this.tsMap.on('mousemove', onMove);

    });


    this.tsMap.on('mouseup', 'points', (e) => {

      // reinstate enter and leave behaviour
      this.tsMap.on('mouseleave', 'points', onMouseLeave);
      this.tsMap.on('mouseenter', 'points', onMouseEnter);

      this.tsMap.getCanvas().style.cursor = 'pointer';
      this.tsMap.off('mousemove', onMove);
    });




  }

  onClickGetCoords = (e) => {

// console.log(this.tsMap.queryRenderedFeatures(e.point).some(point => point.source === 'points') );
    const isClickedOnPoint = this.tsMap.queryRenderedFeatures(e.point).some(point => point.source === 'points');
    console.log(isClickedOnPoint);

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
        this.getPath(this.history.lastPoint(), clickedPoint)
          .then( () => {
            this.spinner.removeElement();
            this.updateMap();
          })
          .catch( (error) => {
            this.spinner.removeElement();
            this.alert.showAsElement('Something went wrong :(', error.status + ': ' + error.error, true, false)
              .subscribe( () => {});
        });

      }
    }
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
