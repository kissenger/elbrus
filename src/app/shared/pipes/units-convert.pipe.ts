import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'unitConvert'
})

export class UnitsConvertPipe implements PipeTransform {

  /**
   * @param value value to be piped
   * @param type if distance or elevation only unitA is expected - for lumpiness unit B also
   * @param unitA can be km or mi for distance, or ft or m for elevation or lumpiness
   * @param unitB can be km or mi for lumpiness
   */
  transform(
      value: number,
      type: 'distance' | 'elevation' | 'lumpiness',
      unitA: 'km' | 'mi' | 'ft' | 'm',
      unitB?: 'km' | 'mi'
    ): number {

    const M_2_FT = 3.28084;
    const KM_2_MI = 0.62137;

    // if value is a distance, baseline is km
    if (type === 'distance') {

      // convert meters to km
      value /= 1000.0;

      if (unitA === 'km') {
        return (value);
      } else if (unitA === 'mi') {
        return (value * KM_2_MI);
      }

    // if value is an elevation, baseline is meters
    } else if (type === 'elevation') {
      if (unitA === 'm') {
        return value;
      } else if (unitA === 'ft') {
        return (value * M_2_FT);
      }

    // if value is a lumpiness (elevation/height), baseline is m/km
    } else if (type === 'lumpiness') {

      // check for divide by 0 error
      if (isNaN(value)) { return 0; }

      if (unitA === 'm') {
        if (unitB === 'km' ) {
          return value;
        } else if (unitB === 'mi') {
          return value / KM_2_MI;
        }
      } else if (unitA === 'ft') {
        if (unitB === 'km' ) {
          return value * M_2_FT;
        } else if (unitB === 'mi') {
          return value * M_2_FT / KM_2_MI;
        }
      }
    }
  }
}
