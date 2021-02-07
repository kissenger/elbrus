import { TsPosition } from './../interfaces';
import { DataService } from 'src/app/shared/services/data.service';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})

export class LocationService {

  private mapInstance;
  private navHandler: any;
  private watchOptions: {
    enableHighAccuracy: true,
    timeout: 5000,
    maximumAge: 5000
  };
  private position: TsPosition;
  private accuracy: number;
  private isDev = !environment.production;


  constructor(
    private data: DataService
  ) {
  }


  watch(map) {

    this.mapInstance = map;
    this.addAccuracyLayer();
    this.addPositionLayer();


    this.navHandler = navigator.geolocation.watchPosition(
    (pos) => {
      this.position = [pos.coords.longitude, pos.coords.latitude];
      this.accuracy = pos.coords.accuracy;
      this.data.locationEmitter.emit(this.position); // enables menu btns if location is available
      this.updateMap();
    },
    (error) => {
      this.position = null;
      this.accuracy = null;
      this.data.locationEmitter.emit(this.position);
      this.updateMap();
    },
    this.watchOptions);


  }



  updateMap() {

    if (this.isDev) { console.log({position: this.position, accuracy: this.accuracy}); }

    const coords = this.position ? [this.position] : null;
    const props = this.position ? [{accuracy: this.accuracy, latitude: this.position[1]}] : null;
    this.mapInstance.setLayerData('position', 'Point', coords);
    this.mapInstance.setLayerData('accuracy', 'Point', coords, props);
  }



  addPositionLayer() {
    this.mapInstance.addPointsLayer('position', {
      'circle-radius': 4,
      'circle-opacity': 1,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#523209',
      'circle-color': '#83964B',
    });
  }



  addAccuracyLayer() {
    // 0.019 is from https://docs.mapbox.com/help/glossary/zoom-level/#zoom-levels-and-geographical-distance
    this.mapInstance.addPointsLayer('accuracy', {
      'circle-radius': [
        'interpolate', ['exponential', 2], ['zoom'],
            0, 0,
            22, ['/', ['get', 'accuracy'], ['*', 0.019, ['cos', ['/', ['*', ['get', 'latitude'], ['pi']], 180]]]]
      ],
      'circle-opacity': 0.1,
      'circle-stroke-width': 1,
      'circle-stroke-color': '#523209',
      'circle-stroke-opacity': 0.5,
      'circle-color': '#83964B',
    });
  }



  unwatch() {
    navigator.geolocation.clearWatch(this.navHandler);
  }

}


