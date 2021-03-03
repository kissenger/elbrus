import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { TsCallingPageType } from 'src/app/shared/interfaces';
import { DataService } from 'src/app/shared/services/data.service';

@Component({
  selector: 'app-display-wide',
  templateUrl: './display-wide.component.html',
  styleUrls: ['./display-wide.component.css']
})
export class DisplayWideComponent implements OnInit, OnDestroy {

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
  }

  onToggleClick() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  ngOnDestroy() {
  }


}

