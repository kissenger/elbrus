import { Pipe, PipeTransform } from '@angular/core';
import { UnitsConvertPipe } from 'src/app/shared/pipes/units-convert.pipe';

@Pipe({
  name: 'unitsString'
})

export class UnitsStringPipe implements PipeTransform {

  constructor(
    private unitsConvertPipe: UnitsConvertPipe
  ) {}

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
    ): string {

    if (type === 'distance') {
      return this.unitsConvertPipe.transform(value, type, unitA, unitB).toPrecision(3) + unitA;

    } else if (type === 'elevation') {
      return this.unitsConvertPipe.transform(value, type, unitA, unitB).toFixed(0) + unitA;

    } else if (type === 'lumpiness') {
      const unitString = unitA + '/' + unitB;
      return this.unitsConvertPipe.transform(value, type, unitA, unitB).toFixed(0) + unitString;

    }
  }
}
