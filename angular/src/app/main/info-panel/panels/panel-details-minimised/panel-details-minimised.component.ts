import { Component, OnInit, OnDestroy, Input, ViewChild, TemplateRef } from '@angular/core';
import * as globals from 'src/app/shared/globals';
import { DataService } from 'src/app/shared/services/data.service';
import { Subscription } from 'rxjs';
import { TsUnits, TsPathStats } from 'src/app/shared/interfaces';
import { AuthService } from 'src/app/shared/services/auth.service';

@Component({
  selector: 'app-panel-details-minimised',
  templateUrl: './panel-details-minimised.component.html',
  styleUrls: ['./panel-details-minimised.component.css']
})
export class PanelDetailsMinimisedComponent implements OnInit, OnDestroy {

  // local variables
  @Input() callingPage: string;
  private activePathSubscription: Subscription;
  public pathStats: TsPathStats = globals.emptyStats;
  public isData = false;
  public units: TsUnits = this.auth.getUser().units;

  constructor(
    private dataService: DataService,
    private auth: AuthService
  ) {}

  ngOnInit() {

    this.activePathSubscription = this.dataService.activePathEmitter.subscribe( (geoJson) => {

      // used by html to say 'nothing to show' if the geojson only has a single point or fewer
      if (geoJson.features[0].geometry.coordinates.length <= 1) {
        this.isData = false;
      } else {
        this.isData = true;
      }

      this.pathStats = geoJson.properties.stats;

    });
  }

  ngOnDestroy() {
    this.activePathSubscription.unsubscribe();
  }

}
