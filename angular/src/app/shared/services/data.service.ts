import { EventEmitter, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { TsUnits } from '../interfaces';

@Injectable({
  providedIn: 'root'
})
export class DataService {

  constructor(
    private router: Router
  ) {
  }



  public unitsUpdateEmitter = new EventEmitter();
  // private units: TsUnits;

  /**
   * Collection of variables and methods to enable emission, storage and retrieval of the
   * CREATED OR IMPORTED PATHS BEFORE RECALL FROM DB
   */
  public menuClickEmitter = new EventEmitter();          // from map service to info panel
  public pathStatsEmitter = new EventEmitter();   // from map-create to panel-create-detail
  public activeTabEmitter = new EventEmitter();          // from map service to info panel
  public loginUserEmitter = new EventEmitter();   // from login to header
  // stored by map-create-service, accessed by panel-routes-create-details
  // public createdPathData: {coords: Array<TsCoordinate>, elevations: {elevs: Array<number>, elevationStatus: string}};
  // stored by panel-routes-list-options, accessed by panel-routes-create-details
  // public importedPathData: {pathId: string, info: {}};

  /**
   * Collection of variables and methods to enable emission, storage and retrieval of the
   * CURRENTLY ACTIVE PATH RECALLED FROM DATABASE
   */
  // public desiredPathEmitter = new EventEmitter();   // emits from panel-routes-list-list and subscribed to in routes-list
  public activePathEmitter = new EventEmitter();
  public pathIdEmitter = new EventEmitter();
  public mapBoundsEmitter = new EventEmitter();
  /**
   * Data store
   * @param dataStore is a key/value object to store all shared dat in one place
   */
  private dataStore: Object = {};

  // saves a key/value pair to the data store, also emitting the same data if {{emit}} is true
  public saveToStore(keyName: string, value: any) {
    this.dataStore[keyName] = value;
  }

  // returns the current value of a named key, setting the value to null if {{clearKey}} is true
  public getFromStore(keyName: string, clearKey: boolean) {
    const returnData = this.dataStore[keyName];
    if (clearKey) { delete this.dataStore[keyName]; }
    return returnData;
  }

  public showStore() {
    console.log(this.dataStore);
  }


  // setUnits(units: TsUnits) {
  //   this.units = units;
  // }

  // getUnits() {
  //   return this.units;
  // }


}

