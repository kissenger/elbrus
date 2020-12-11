import { TsCoordinate } from './../interfaces';
import { TsFeatureCollection } from 'src/app/shared/interfaces';
import { EventEmitter, Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})

export class DataService {

  public clickedCoordsEmitter = new EventEmitter();
  public unitsUpdateEmitter = new EventEmitter();
  public pathStatsEmitter = new EventEmitter();           // from map-create to panel-create-detail
  public activeTabEmitter = new EventEmitter();           // from map service to info panel
  public loginUserEmitter = new EventEmitter();           // from login to header
  public pathCommandEmitter = new EventEmitter();         // from panel-list to routes-list
  public chartPointEmitter = new EventEmitter();          // from panel-details to routes-list - listen for mouse on chart event
  public pathIdEmitter = new EventEmitter();              // from data to panel-details, panel-list
  public minimisePanelEmitter = new EventEmitter();       // from info-panel to panel-details
  public mapBoundsEmitter = new EventEmitter();           // from map to ...

  private dataStore: Object = {};


  // set path is a wrapper for set function for storing path data - also emits the pathId to let
  // components know that a new route is available
  public setPath(geoJson: TsFeatureCollection) {
    this.set({activePath: geoJson});
    this.pathIdEmitter.emit(geoJson ? geoJson.properties.pathId : '0000');
  }


  // a wrapper for getting paths, for consistency with setPath
  public getPath() {
    return this.get('activePath');
  }



  // saves a key/value pair to the data store
  public set(data: {
    mapView?: any,
    redirect?: string,
    isPosition?: boolean,
    activePath?: TsFeatureCollection,
    newLocation?: TsCoordinate
  }) {
    Object.keys(data).forEach( key => {
      this.dataStore[key] = data[key];
    });
  }


  // returns the value for a provided key
  public get(keyName: string) {
    if (keyName in this.dataStore) {
      return this.dataStore[keyName];
    } else {
      console.log('WARNING: attempted to get un-set data');
    }
  }


  // delete key/value pair from the store
  public clearKey(keyName: string) {
    if (keyName in this.dataStore) {
      delete this.dataStore[keyName];
    }
  }


  // debugging
  public show() {
    console.log(this.dataStore);
  }



}

