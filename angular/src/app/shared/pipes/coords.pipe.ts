import { TsCoordinate } from '../interfaces';
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'coords'
})

export class CoordsPipe implements PipeTransform {

  transform(lngLat: TsCoordinate): string {

    return '[' + lngLat.lng.toFixed(5) + ', ' + lngLat.lat.toFixed(5) + ']';

  }
}
