
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { TsPosition } from '../interfaces';

@Injectable({
  providedIn: 'root'
})

export class LocationService {

  private navHandler: any;
  private currentLocation: TsPosition = null;
  private watchOptions: {
    enableHighAccuracy: false,
    timeout: 5000,
    maximumAge: 5000
  };

  constructor(
  ) {
  }

  watch(): Observable<Object> {

    return new Observable(observer => {

      this.navHandler = navigator.geolocation.watchPosition(
      (pos: Position) => {
        this.currentLocation = [pos.coords.longitude, pos.coords.latitude];
        observer.next(this.currentLocation);
      },
      (error) => {
        this.currentLocation = null;
        observer.next(this.currentLocation);
      },
      this.watchOptions);
    });

  }


  isLocation() {
    return !!this.currentLocation;
  }


  unwatch() {
    navigator.geolocation.clearWatch(this.navHandler);
  }

}
