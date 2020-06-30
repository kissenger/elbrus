
/**
 * Listens for request from panel-list component, makes the backend request and uses
 * map-service to make the desired changes to the plot
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { MapService } from 'src/app/shared/services/map.service';
import { DataService } from 'src/app/shared/services/data.service';
import { HttpService } from 'src/app/shared/services/http.service';
import { Subscription } from 'rxjs';
import { TsPlotPathOptions } from 'src/app/shared/interfaces';

@Component({
  selector: 'app-routes',
  templateUrl: './routes-list.component.html',
  styleUrls: ['./routes-list.component.css']
})

export class RoutesListComponent implements OnInit, OnDestroy {

  private pathIdSubscription: Subscription;

  constructor(
    private dataService: DataService,
    private mapService: MapService,
    private httpService: HttpService
    ) { }


  ngOnInit() {

    // if we come into list component from eg delete route, the map exists and is causing trouble, so delete it and start afresh
    if (this.mapService.isMap()) { this.mapService.kill(); }

    this.mapService.newMap();

    this.pathIdSubscription = this.dataService.pathIdEmitter.subscribe( ( request ) => {

        if ( request.command === 'add' ) {
          this.httpService.getPathById('route', request.id).subscribe( (result) => {
            this.mapService.add(result.hills, {lineColour: request.colour}, {booSaveToStore: request.emit} );
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
