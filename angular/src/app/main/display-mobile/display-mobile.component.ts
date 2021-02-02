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

  constructor(
    public data: DataService
   ) { }

  ngOnInit() {
  }

  onToggleClick() {
    this.isMenuOpen = !this.isMenuOpen;
  }

}

