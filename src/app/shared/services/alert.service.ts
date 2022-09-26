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

  private alertBox: NgElement & WithProperties<AlertBoxComponent>;

  constructor() { }

  removeElement() {
    if (document.body.contains(this.alertBox)) {
      document.body.removeChild(this.alertBox);
      this.alertBox = null;
    }
  }

  showAsElement(title: string, message: string, okBtn: boolean, cancelBtn: boolean) {

    if (this.alertBox) {
      this.removeElement();
    }

    // Create element
    this.alertBox = document.createElement('alert-box') as any;
    this.alertBox.message = message;
    this.alertBox.title = title;
    this.alertBox.okBtn = okBtn;
    this.alertBox.cancelBtn = cancelBtn;

    // Add to the DOM
    document.body.appendChild(this.alertBox);

    return new Observable( (observer) => {

      // Listen to the cancel event
      this.alertBox.addEventListener('cancel', () => {
        document.body.removeChild(this.alertBox);
        return observer.next(false);
      });

      // Listen to the ok event
      this.alertBox.addEventListener('ok', () => {
        document.body.removeChild(this.alertBox);
        return observer.next(true);
      });
    });
  }
}
