import { ScreenSizeService } from './shared/services/screen-size.service';
import { Component, Injector, OnInit } from '@angular/core';
import { createCustomElement } from '@angular/elements';
import { AlertBoxComponent } from 'src/app/shared/components/alert-box/alert-box.component';
import { SpinnerComponent } from 'src/app/shared/components/spinner/spinner.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'cotopaxi';

  constructor(
    injector: Injector,
    private screenSize: ScreenSizeService
  ) {

    //  // See angular custom elements example: https://angular.io/guide/elements

    const SpinnerElement = createCustomElement(SpinnerComponent, {injector});
    customElements.define('bootstrap-spinner', SpinnerElement);

    const AlertBoxElement = createCustomElement(AlertBoxComponent, {injector});
    customElements.define('alert-box', AlertBoxElement);

   }

   ngOnInit() {
  }


}
