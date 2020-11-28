import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'unitsLongName'
})

export class UnitsLongNamePipe implements PipeTransform {

  transform(shortName: string): string {

    switch (shortName) {
      case 'ft': return 'feet';
      case 'm': return 'metres';
      case 'mi': return 'miles';
      case 'km': return 'kilometers';
    }

  }
}
