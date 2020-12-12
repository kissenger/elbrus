import { AuthService } from './../../shared/services/auth.service';
import { TsPosition, TsCoordinate, TsSnapType } from './../../shared/interfaces';
import { Subscription } from 'rxjs';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { TsCallingPageType } from 'src/app/shared/interfaces';
import { DataService } from 'src/app/shared/services/data.service';

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

  constructor(
    private data: DataService,
    private auth: AuthService
   ) { }

  ngOnInit() {

    this.homeLngLat = this.auth.getUser().homeLngLat;

    // listen for when data is set to be able to enable the view buttons
    this.newPathListener = this.data.pathIdEmitter.subscribe( () => {
      this.isData = this.data.getPath();
    });

    // listen for availability of location
    this.locationListener = this.data.locationEmitter.subscribe( (pos) => {
      this.position = pos;
    });

  }


  onChangeOptions(type: TsSnapType) {
    this.map.snapType = type;
  }

  ngOnDestroy() {
    if (this.newPathListener) { this.newPathListener.unsubscribe(); }
    if (this.locationListener) { this.locationListener.unsubscribe(); }
  }


}

