import { Subscription } from 'rxjs';
import { DataService } from 'src/app/shared/services/data.service';
import { Component, Input, OnInit } from '@angular/core';
import { TsCallingPageType } from 'src/app/shared/interfaces';

@Component({
  selector: 'app-display-mobile',
  templateUrl: './display-mobile.component.html',
  styleUrls: ['./display-mobile.component.css']
})
export class DisplayMobileComponent implements OnInit {

  @Input() callingPage: TsCallingPageType;
  @Input() map: mapboxgl.Map;

  public isMenuOpen = true;
  public vh: number;

  constructor(
    public data: DataService
   ) { }

  ngOnInit() {
    // https://css-tricks.com/the-trick-to-viewport-units-on-mobile/
    this.vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${this.vh}px`);

    if (this.callingPage === 'create') {
      this.isMenuOpen = false;
    }
  }

  onToggleClick() {
    this.isMenuOpen = !this.isMenuOpen;
  }

}

