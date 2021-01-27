import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { TsCallingPageType } from 'src/app/shared/interfaces';

@Component({
  selector: 'app-display-mobile',
  templateUrl: './display-mobile.component.html',
  styleUrls: ['./display-mobile.component.css']
})
export class DisplayMobileComponent implements OnInit, OnDestroy {

  @Input() callingPage: TsCallingPageType;
  @Input() map: mapboxgl.Map;

  public isMenuOpen = true;

  constructor(
   ) { }

  ngOnInit() {
  }

  onToggleClick() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  ngOnDestroy() {
  }


}

