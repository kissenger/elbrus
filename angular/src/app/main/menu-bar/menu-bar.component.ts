import { AuthService } from './../../shared/services/auth.service';
import { TsPosition, TsCoordinate, TsSnapType, TsMapType } from './../../shared/interfaces';
import { Subscription } from 'rxjs';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { TsCallingPageType } from 'src/app/shared/interfaces';
import { DataService } from 'src/app/shared/services/data.service';
import * as globals from 'src/app/shared/globals';
import { ScreenSizeService } from 'src/app/shared/services/screen-size.service';

@Component({
  selector: 'app-menu-bar',
  templateUrl: './menu-bar.component.html',
  styleUrls: ['./menu-bar.component.css']
})
export class MenuBarComponent implements OnInit, OnDestroy {

  @Input() callingPage: TsCallingPageType;
  @Input() map;

  private newPathListener: Subscription;
  private locationListener: Subscription;
  public isData = false;
  public position: TsPosition;
  public homeLngLat: TsCoordinate;
  public isMinimised = false;
  public showMapMenu = false;
  public showToolsMenu = false;
  public windowWidth: number;
  public BREAKPOINT = globals.BREAKPOINTS.MD;

  constructor(
    private data: DataService,
    public auth: AuthService,
    private screenSize: ScreenSizeService
   ) {
    this.windowWidth = this.screenSize.width;
    this.screenSize.resize.subscribe( (newWidth: {width: number, height: number}) => {
      this.windowWidth = newWidth.width;
    });
   }

  ngOnInit() {

    this.homeLngLat = this.auth.user.homeLngLat;

    // listen for when data is set to be able to enable the view buttons
    this.newPathListener = this.data.pathIdEmitter.subscribe( () => {
      this.isData = this.data.getPath();
    });

    // listen for availability of location
    this.locationListener = this.data.locationEmitter.subscribe( (pos) => {
      this.position = pos;
    });

  }

  onMapIconClick() {
    this.showMapMenu = !this.showMapMenu;
  }

  onToolsIconClick() {
    this.showToolsMenu = !this.showToolsMenu;
  }

  onMapTypeSelect(type: TsMapType) {
    this.map.setType(type);
  }


  onSnapSelect(type: TsSnapType) {
    this.map.snapType = type;
  }

  onMinimiseClick() {
    this.isMinimised = !this.isMinimised;
  }

  ngOnDestroy() {
    if (this.newPathListener) { this.newPathListener.unsubscribe(); }
    if (this.locationListener) { this.locationListener.unsubscribe(); }
  }


}

