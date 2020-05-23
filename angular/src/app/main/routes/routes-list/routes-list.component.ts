import { Component, OnInit, OnDestroy } from '@angular/core';
import { MapService } from 'src/app/shared/services/map.service';
import { DataService } from 'src/app/shared/services/data.service';
import { HttpService } from 'src/app/shared/services/http.service';
import { Subscription } from 'rxjs';
import { TsLineStyle, TsPlotPathOptions } from 'src/app/shared/interfaces';
import { AuthService } from 'src/app/shared/services/auth.service';

@Component({
  selector: 'app-routes',
  templateUrl: './routes-list.component.html',
  styleUrls: ['./routes-list.component.css']
})

export class RoutesListComponent implements OnInit, OnDestroy {

  private pathIdSubscription: Subscription;
  private geoJSON;
  private plotOptions: TsPlotPathOptions = {
    booResizeView: true,
    booSaveToStore: true,
    booPlotMarkers: true
  };
  private lineStyle: TsLineStyle = {}; // take lineStyle from geoJSON


  constructor(
    private dataService: DataService,
    private mapService: MapService,
    private httpService: HttpService
    ) { }

  /**
   * Component RoutesListComponent
   * Contains map and info panel
   * Displays route on map
   *
   *
   *
   */

  ngOnInit() {

    // if we come into list component from eg delet route, the map exists and is causing trouble, so delete it and start afresh
    if (this.mapService.isMap()) { this.mapService.killMap(); }

    // listen for pathID emission from panel-routes-list-list, and get the path from the backend
    this.pathIdSubscription = this.dataService.pathIdEmitter.subscribe( (pathId: string) => {

      if (pathId === '0') {
        // no path id found so default to users dfault location
        this.mapService.initialiseMap();
        document.getElementById('Options').click();
        // this.dataService.activeTabEmitter.emit('options');
      }

      this.httpService.getPathById('route', pathId).subscribe( (result) => {

        // put on the class to avoid passing to functions
        this.geoJSON = result.hills;

        // as initialisation will temporarily show default location, only run it if map doesnt currently exist
        this.initialiseMapIfNeeded().then( () => {

          this.mapService.clearMap();
          this.mapService.addLayerToMap(this.geoJSON, this.lineStyle, this.plotOptions);

        });
      });
    });
  }

  /**
   * checks if map already exists, and if not then create it and wait for it to load
   */
  initialiseMapIfNeeded() {

    return new Promise( (resolve, reject) => {

      if (!this.mapService.isMap()) {

        const cog = {
          lng: ( this.geoJSON.bbox[0] + this.geoJSON.bbox[2] ) / 2,
          lat: ( this.geoJSON.bbox[1] + this.geoJSON.bbox[3] ) / 2 };

        this.mapService.initialiseMap(cog, 10)
          .then( () => resolve() )
          .catch( e => reject(e) );

      } else {
        resolve();
      }

    });

  }

  ngOnDestroy() {
    this.pathIdSubscription.unsubscribe();
  }

}
