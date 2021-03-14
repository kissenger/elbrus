// import { AutoNamePipe } from './../../../../shared/pipes/auto-name.pipe';
import { DataService } from 'src/app/shared/services/data.service';
import { AuthService } from 'src/app/shared/services/auth.service';
import * as globals from 'src/app/shared/globals';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { TsCallingPageType, TsFeatureCollection, TsUnits } from 'src/app/shared/interfaces';
import { AutoNamePipe } from 'src/app/shared/pipes/auto-name.pipe';

@Component({
  selector: 'app-panel-details-summary',
  templateUrl: './panel-details-summary.component.html',
  styleUrls: ['./panel-details-summary.component.css']
})
export class PanelDetailsSummaryComponent implements OnInit, OnDestroy {

  @Input() callingPage: TsCallingPageType;

  // listeners
  private unitsListener: Subscription;

  // geoJson variables
  public geoJson: TsFeatureCollection;
  public pathName: string;          // name of path provided with the incoming data, OR a created default if that is null
  public givenName: string = null;     // name given to the path in the details form; overrides the default name
  public units: TsUnits;
  public isElevations: boolean;

  constructor(
    private auth: AuthService,
    public data: DataService,
    private autoNamePipe: AutoNamePipe
  ) {}


  ngOnInit() {

    this.units = this.auth.isRegistered ? this.auth.user.units : globals.defaultUnits;
    this.unitsListener = this.data.unitsUpdateEmitter.subscribe( () => {
      this.units = this.auth.user.units;
    });

    // both created and imported paths data are sent from map-service when the geoJSON is plotted: listen for the broadcast
    // broadcast is only the path Id - listen for it, but dont save it, just go and pick up whats in the store
    this.updateDetails();
    this.data.pathIdEmitter.subscribe( () => {
      this.updateDetails();
    });

  }

  updateDetails() {

    if ( this.data.isPath() ) {

      this.geoJson = this.data.getPath();
      this.isElevations = this.geoJson.properties.info.isElevations && !this.geoJson.properties.info.isLong;

      if (this.geoJson?.properties?.info?.name) {
        this.givenName = this.geoJson.properties.info.name;
      } else {
        this.givenName = this.autoNamePipe.transform(
          null, this.geoJson.properties.info.category, this.geoJson.properties.info.pathType);
      }

    }


  }


  ngOnDestroy() {
    if (this.unitsListener) { this.unitsListener.unsubscribe(); }
  }

}
