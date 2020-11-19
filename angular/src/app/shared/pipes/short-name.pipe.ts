import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'shortName'
})

export class ShortNamePipe implements PipeTransform {


  transform(name: string, length: number): string {

    if ( name.length <= length ) {
      return name;
    } else {
      return name.slice(0, length) + '...';
    }
  }

}
