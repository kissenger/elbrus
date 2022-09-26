import { TsPosition } from '../interfaces';
import { DataService } from 'src/app/shared/services/data.service';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})

export class PositionService {

  private navHandler: any;

  constructor(
    private data: DataService
  ) {
  }

  get current() {
    return new Promise<TsPosition>( (resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve([pos.coords.longitude, pos.coords.latitude]),
        (error) => resolve(null),
        {
          enableHighAccuracy: true,
          timeout: 500,
          maximumAge: 0
        }
      );
    });
  }


  watch() {

    this.navHandler = navigator.geolocation.watchPosition(
      (pos) => {
        const position = [pos.coords.longitude, pos.coords.latitude];
        const accuracy = pos.coords.accuracy;
        this.data.set({devicePosition: <TsPosition>position});
        this.data.set({deviceAccuracy: accuracy});
        this.data.positionEmitter.emit(null); // enables menu btns if location is available
      },
      (error) => this.data.positionEmitter.emit(null),
      // (error) => console.log('watcherror'),
      {
        enableHighAccuracy: true,
        timeout: Infinity,
        maximumAge: 5000
      }
    );

  }


  unwatch() {
    navigator.geolocation.clearWatch(this.navHandler);
  }

}


