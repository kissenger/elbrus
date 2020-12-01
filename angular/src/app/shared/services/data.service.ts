import { TsFeatureCollection } from 'src/app/shared/interfaces';
import { EventEmitter, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})

export class DataService {

  // used by header component to show different elements when welcome page is shown
  public locationEmitter = new EventEmitter();




  public unitsUpdateEmitter = new EventEmitter();
  // private units: TsUnits;

  /**
   * Collection of variables and methods to enable emission, storage and retrieval of the
   * CREATED OR IMPORTED PATHS BEFORE RECALL FROM DB
   */
  public menuClickEmitter = new EventEmitter();           // from map service to info panel
  public pathStatsEmitter = new EventEmitter();           // from map-create to panel-create-detail
  public activeTabEmitter = new EventEmitter();           // from map service to info panel
  public loginUserEmitter = new EventEmitter();           // from login to header
  public pathCommandEmitter = new EventEmitter();         // from panel-list to routes-list
  public chartPointEmitter = new EventEmitter();          // from panel-details to routes-list - listen for mouse on chart event

  // public selectedPathsEmitter = new EventEmitter();       // from panel-list to panel-details-minimised

  // from map-service & map-create-service to panel-details & panel-deails minimsied
  // ensures the details panel has required information about the route being plotted
  public pathIdEmitter = new EventEmitter();
  public minimisePanelEmitter = new EventEmitter();

  public mapBoundsEmitter = new EventEmitter();
  // stored by map-create-service, accessed by panel-routes-create-details
  // public createdPathData: {coords: Array<TsCoordinate>, elevations: {elevs: Array<number>, elevationStatus: string}};
  // stored by panel-routes-list-options, accessed by panel-routes-create-details
  // public importedPathData: {pathId: string, info: {}};

  /**
   * Collection of variables and methods to enable emission, storage and retrieval of the
   * CURRENTLY ACTIVE PATH RECALLED FROM DATABASE
   */
  // public desiredPathEmitter = new EventEmitter();   // emits from panel-routes-list-list and subscribed to in routes-list
  // public activePathEmitter = new EventEmitter();

  // emitter: panel-list, subscriber: routes-list
  /**
   * Data store
   * @param dataStore is a key/value object to store all shared dat in one place
   */


  private dataStore: Object = {};

  // set path has option to emit - actually controls save and always emits but the maintaining the legacy terminology for now
  public setPath(geoJson: TsFeatureCollection, emit: boolean) {
    if (emit) { this.dataStore['activePath'] = geoJson; }
    this.pathIdEmitter.emit(geoJson.properties.pathId);
  }


  // saves a key/value pair to the data store
  public set(keyName: string, value: any) {
    this.dataStore[keyName] = value;
  }

  // returns the current value of a named key, setting the value to null if {{clearKey}} is true
  public get(keyName: string, clearKey: boolean) {
    const returnData = this.dataStore[keyName];
    if (clearKey) { delete this.dataStore[keyName]; }
    return returnData;
  }

  public show() {
    console.log(this.dataStore);
  }


  // setUnits(units: TsUnits) {
  //   this.units = units;
  // }

  // getUnits() {
  //   return this.units;
  // }


}

