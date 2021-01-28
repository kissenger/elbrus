import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { TsCallingPageType } from 'src/app/shared/interfaces';

@Component({
  selector: 'app-display-desktop',
  templateUrl: './display-desktop.component.html',
  styleUrls: ['./display-desktop.component.css']
})
export class DisplayDesktopComponent implements OnInit, OnDestroy {

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

