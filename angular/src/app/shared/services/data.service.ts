import { TsDataStoreKeyValuePairs } from './../interfaces';
import { TsFeatureCollection } from 'src/app/shared/interfaces';
import { EventEmitter, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})

export class DataService {

  public clickedCoordsEmitter = new EventEmitter();
  public positionEmitter = new EventEmitter();            // from location service to menu-bar
  public unitsUpdateEmitter = new EventEmitter();
  public pathStatsEmitter = new EventEmitter();           // from map-create to panel-create-detail
  public activeTabEmitter = new EventEmitter();           // from map service to info panel
  public loginUserEmitter = new EventEmitter();           // from login to header
  public pathCommandEmitter = new EventEmitter();         // from panel-list to routes-list
  public chartPointEmitter = new EventEmitter();          // from panel-details to routes-list - listen for mouse on chart event
  public pathIdEmitter = new EventEmitter();              // from data to panel-details, panel-list
  public mapBoundsEmitter = new EventEmitter();           // from map to ...
  public forceMenuCloseEmitter = new EventEmitter();      // from options on create route click to display-mobile

  private dataStore: Object = {};
  // private _path: {geoJson: TsFeatureCollection, isSet: boolean} = {geoJson: null, isSet: false};


  // set path is a wrapper for set function for storing path data - also emits nothing to let
  // components know that a new route is available
  public setPath(geoJson: TsFeatureCollection) {
    this.set({_path: geoJson});
    this.pathIdEmitter.emit(null);
  }

  // returns true if saved path is linestring, false or not set
  public isPath() {
    try {
      return this.get('_path')?.features[0].geometry.type === 'LineString';
    } catch {
      return false;
    }
  }


  // a wrapper for getting paths, for consistency with setPath
  // returns the geojson path if it was set, null if is was set but is empty, and false if it was not set
  public getPath() {
    try {
      return this.get('_path');
    } catch {
      return null;
    }
  }


  public clearPath() {
    this.set({_path: null });
    this.pathIdEmitter.emit(); // ensures tabs are disabled when there is no data
  }




  // saves a key/value pair to the data store
  public set(data: TsDataStoreKeyValuePairs) {
    Object.keys(data).forEach( key => {
      this.dataStore[key] = data[key];
    });
  }


  // returns the value for a provided key
  public get(keyName: keyof TsDataStoreKeyValuePairs) {
      return this.dataStore[keyName];
  }

  public clearAll() {
    this.dataStore = {};
  }

  // delete key/value pair from the store
  public clearKey(keyName: keyof TsDataStoreKeyValuePairs) {
    if (keyName in this.dataStore) {
      delete this.dataStore[keyName];
    }
  }


  // debugging
  public show() {
    console.log(this.dataStore);
  }



}

