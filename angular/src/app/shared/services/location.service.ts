
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { TsPosition } from '../interfaces';

@Injectable({
  providedIn: 'root'
})

export class LocationService {

  private currentLocation: TsPosition = null;
  private watchOptions: {
    enableHighAccuracy: false,
    timeout: 5000,
    maximumAge: 5000
  };

  constructor(
    // public map: MapService
  ) {
  }

  watch(): Observable<Object> {

    return new Observable(observer => {
      navigator.geolocation.watchPosition((pos: Position) => {
        console.log(pos);
        this.currentLocation = [pos.coords.longitude, pos.coords.latitude];
        // observer.next(this.currentLocation);
        observer.next(this.currentLocation);

      },
      (error) => {
        console.log(error);
        // observer.error(error);
        throw error;
      },
      this.watchOptions);
    });
  }

  isLocation() {
    return !!this.currentLocation;
  }

}
