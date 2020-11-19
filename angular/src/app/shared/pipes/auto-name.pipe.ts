
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'autoName'
})

export class AutoNamePipe implements PipeTransform {

  transform(name: string, category: string, type: string): string {

    if (name) {
      return name;
    } else {
      return  (category === 'None' ? 'Uncategorised' : category) + ' ' + type;
    }
  }

}
