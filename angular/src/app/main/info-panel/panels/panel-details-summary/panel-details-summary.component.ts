// import { AutoNamePipe } from './../../../../shared/pipes/auto-name.pipe';
import { DataService } from 'src/app/shared/services/data.service';
import { AuthService } from 'src/app/shared/services/auth.service';
import * as globals from 'src/app/shared/globals';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { TsCallingPageType, TsFeatureCollection, TsUnits } from 'src/app/shared/interfaces';

@Component({
  selector: 'app-panel-details-summary',
  templateUrl: './panel-details-summary.component.html',
  styleUrls: ['./panel-details-summary.component.css']
})
export class PanelDetailsSummaryComponent implements OnInit, OnDestroy {

  @Input() callingPage: TsCallingPageType;

  // listeners
  // private pathListener: Subscription;

  // geoJson variables
  public geoJson: TsFeatureCollection;
  public pathName: string;          // name of path provided with the incoming data, OR a created default if that is null
  public units: TsUnits;

  constructor(
    private auth: AuthService,
    public data: DataService
  ) {}


  ngOnInit() {

    this.units = this.auth.isRegisteredUser() ? this.auth.getUser().units : globals.defaultUnits;
    this.data.unitsUpdateEmitter.subscribe( () => {
      this.units = this.auth.getUser().units;
    });

    // both created and imported paths data are sent from map-service when the geoJSON is plotted: listen for the broadcast
    // broadcast is only the path Id - listen for it, but dont save it, just go and pick up whats in the store
    this.data.pathIdEmitter.subscribe( () => {

      // if ( this.data.isPath() ) {

        this.geoJson = this.data.getPath();
        console.log(this.geoJson);

      // }

    });

  }


  ngOnDestroy() {
  }

}
