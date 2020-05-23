import { Injectable } from '@angular/core';
import { MapService } from './map.service';
import { HttpService } from './http.service';
import { DataService } from './data.service';
import { TsCoordinate, TsPlotPathOptions, TsLineStyle } from 'src/app/shared/interfaces';
import { SpinnerService } from 'src/app/shared/services/spinner.service';
import { AuthService } from 'src/app/shared/services/auth.service';
import { PathHistory } from 'src/app/shared//classes/pathHistory';

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
    booPlotMarkers: true
  };
  private styleOptions: TsLineStyle = {};


  constructor(
    httpService: HttpService,
    dataService: DataService,
    auth: AuthService,
    private spinner: SpinnerService
  ) {
    super(httpService, dataService, auth);
  }

  public getOptions() {
    // Returns the options object - called from routes-create component
    return this.options;
  }

  public createRoute() {
   /**
   * Listens for user click on map, captures coordinates and processes according to snap option,
   * then call necessary functions to update the map
   */

    this.history = new PathHistory();
    this.setUpMap();
    this.tsMap.on('click', (e) => {

      this.spinner.showAsElement();
      const clickedPoint: TsCoordinate = { lat: e.lngLat.lat, lng: e.lngLat.lng };

      if (!this.history.isFirstPointSet()) {
        // First click on map
        this.history.setFirstPoint(clickedPoint);
        this.addMarkerToMap(clickedPoint, '0000');
        this.spinner.removeElement();

      } else {
        // subsequent loops: get path according to snap option, send to backend for missing elevations
        this.getCoordsAndUpdateMap(this.history.lastPoint(), clickedPoint).then( () =>
          this.spinner.removeElement()
        );
      }
    });
  }

  /**
   * gets the coordinates for a given start and end point
   * @param start start point as TsCoordinate pair
   * @param end end point as TsCoordinate pair
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
            console.log('Mapbox directions query failed with error: ' + result.code);
            resolve();
          }
        });
      }
    });
  }

  private getCoordsAndUpdateMap(start: TsCoordinate, end: TsCoordinate) {

    return new Promise( (resolve, reject) => {
      this.getNextPathCoords(start, end).then( (newCoords: Array<TsCoordinate>) => {
        this.httpService.getPathFromPoints(this.history.coords().concat(newCoords)).subscribe( (result) => {
          this.history.add(result.hills);
          this.removeLayerFromMap('0000');
          this.addLayerToMap(this.history.geoJson(), this.styleOptions, this.plotOptions);
          resolve();
        });



        // this.httpService.processPoints(this.history.coords().concat(newCoords), this.history.elevs()).subscribe( (result) => {

        //   // save the incoming geoJSON, add the new set of elevations to the history and update display
        //   this.history.add(result.hills);
        //   this.removeLayerFromMap('0000');
        //   this.addLayerToMap(this.history.geoJson(), this.styleOptions, this.plotOptions);
        //   resolve();
        // });

      });
    });
  }

  public undo() {
    if (this.history.length() === 1) {
      this.clearPath();
    } else {
      this.history.undo();
      this.removeLayerFromMap('0000');
      this.addLayerToMap(this.history.geoJson(), this.styleOptions, this.plotOptions);
    }
  }

  public clearPath() {
    this.removeLayerFromMap('0000');
    this.removeMarkersFromMap();
    this.history = new PathHistory();
  }


  public closePath() {
    this.spinner.showAsElement();
    this.getCoordsAndUpdateMap(this.history.lastPoint(), this.history.firstPoint()).then( () =>
      this.spinner.removeElement()
    );
  }

  kill() {
    this.activeLayers = {};
    this.removeMarkersFromMap();
  }

  setUpMap() {

    this.tsMap.getCanvas().style.cursor = 'crosshair';

      this.tsMap.addSource('geojson', {
        'type': 'geojson',
        'data': {
          'type': 'FeatureCollection',
          'features': []
        }
      });

      this.tsMap.addLayer({
        id: 'measure-lines',
        type: 'line',
        source: 'geojson',
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        },
        filter: ['in', '$type', 'LineString']
      });
  }

}
