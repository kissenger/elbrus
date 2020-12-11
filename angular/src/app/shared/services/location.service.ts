import { DataService } from 'src/app/shared/services/data.service';

import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})

export class LocationService {

  private mapInstance;
  private navHandler: any;
  private geoLocation = null;
  private watchOptions: {
    enableHighAccuracy: false,
    timeout: 5000,
    maximumAge: 5000
  };

  constructor(
    private data: DataService
  ) {
  }


  watch(map) {

    this.mapInstance = map;
    this.addAccuracyLayer();
    this.addPositionLayer();


    this.navHandler = navigator.geolocation.watchPosition(
    (pos: Position) => {
      this.geoLocation = pos;
      this.data.set({isPosition: !!this.geoLocation});
      this.updateMap();
    },
    (error) => {
      this.geoLocation = null;
      this.updateMap();
    },
    this.watchOptions);


  }



  updateMap() {

    // keep this log - useful feedback
    console.log(this.geoLocation);

    const coords = this.geoLocation ? [[this.geoLocation.coords.longitude, this.geoLocation.coords.latitude]] : null;
    const props = [{accuracy: this.geoLocation.coords.accuracy, latitude: this.geoLocation.coords.latitude}];
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
      'circle-opacity': 0.5,
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


