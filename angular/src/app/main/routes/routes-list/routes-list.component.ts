import { Component, OnInit, OnDestroy } from '@angular/core';
import { MapService } from 'src/app/shared/services/map.service';
import { DataService } from 'src/app/shared/services/data.service';
import { HttpService } from 'src/app/shared/services/http.service';
import { Subscription } from 'rxjs';
import { TsLineStyle, TsPlotPathOptions } from 'src/app/shared/interfaces';
import * as globals from 'src/app/shared/globals';
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
    booResizeView: false,
    booSaveToStore: false,
    booPlotMarkers: false,
  };

  constructor(
    private dataService: DataService,
    private mapService: MapService,
    private httpService: HttpService
    ) { }


  ngOnInit() {

    // if we come into list component from eg delete route, the map exists and is causing trouble, so delete it and start afresh
    if (this.mapService.isMap()) { this.mapService.kill(); }

    this.mapService.newMap();

    // listen for pathID emission from panel-routes-list-list, and get the path from the backend
    this.pathIdSubscription = this.dataService.pathIdEmitter.subscribe( ( request ) => {

        if ( request.command === 'add' ) {
          this.httpService.getPathById('route', request.id).subscribe( (result) => {
            this.mapService.add(result.hills, {lineColour: request.colour}, this.plotOptions);
          });

        } else if ( request.command === 'rem' ) {
          this.mapService.remove(request.id);

        } else if ( request.command === 'clear' ) {
          this.mapService.clear();

        }

    });
  }

  /**
   * checks if map already exists, and if not then create it and wait for it to load
   */
  // initialiseMapIfNeeded() {

  //   return new Promise( (resolve, reject) => {

  //     if ( !this.mapService.isMap() ) {

  //       const cog = {
  //         lng: ( this.geoJSON.bbox[0] + this.geoJSON.bbox[2] ) / 2,
  //         lat: ( this.geoJSON.bbox[1] + this.geoJSON.bbox[3] ) / 2 };

  //       this.mapService.newMap(cog, 10)
  //         .then( () => resolve() )
  //         .catch( e => reject(e) );

  //     } else {

  //       resolve();

  //     }

  //   });

  // }

  ngOnDestroy() {
    this.pathIdSubscription.unsubscribe();
  }

}
