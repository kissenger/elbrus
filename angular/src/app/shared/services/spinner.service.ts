import { Injectable } from '@angular/core';
import { NgElement, WithProperties } from '@angular/elements';
import { SpinnerComponent } from 'src/app/shared/components/spinner/spinner.component';

/**
 * Service to launch custom spinner element
 * See angular custom elements example: https://angular.io/guide/elements
 */

@Injectable({
  providedIn: 'root'
})
export class SpinnerService {

  private spinner: NgElement & WithProperties<SpinnerComponent>;
  constructor() { }

  removeElement() {
    if (document.body.contains(this.spinner)) {
      document.body.removeChild(this.spinner);
      this.spinner = null;
    }
  }

  showAsElement() {
    if (!this.spinner) {
      this.spinner = document.createElement('bootstrap-spinner') as any;
      document.body.appendChild(this.spinner);
    }
  }

}
