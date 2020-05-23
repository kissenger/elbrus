import { Injectable } from '@angular/core';
import { NgElement, WithProperties } from '@angular/elements';
import { AlertBoxComponent } from 'src/app/shared/components/alert-box/alert-box.component';
import { Observable } from 'rxjs';

/**
 * Service to launch custom alert-box element
 * See angular custom elements example: https://angular.io/guide/elements
 */

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  constructor() { }

  showAsElement(title: string, message: string, okBtn: boolean, cancelBtn: boolean) {

    // Create element
    const alertBox: NgElement & WithProperties<AlertBoxComponent> = document.createElement('alert-box') as any;
    alertBox.message = message;
    alertBox.title = title;
    alertBox.okBtn = okBtn;
    alertBox.cancelBtn = cancelBtn;

    // Add to the DOM
    document.body.appendChild(alertBox);

    return new Observable( (observer) => {

      // Listen to the cancel event
      alertBox.addEventListener('cancel', () => {
        document.body.removeChild(alertBox);
        return observer.next(false);
      });

      // Listen to the ok event
      alertBox.addEventListener('ok', () => {
        document.body.removeChild(alertBox);
        return observer.next(true);
      });
    });
  }
}
