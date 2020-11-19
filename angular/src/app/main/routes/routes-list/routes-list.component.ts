
/**
 * Listens for request from panel-list component, makes the backend request and uses
 * map-service to make the desired changes to the plot
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { MapService } from 'src/app/shared/services/map.service';
import { DataService } from 'src/app/shared/services/data.service';
import { HttpService } from 'src/app/shared/services/http.service';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';

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
    private httpService: HttpService,
    private router: Router
    ) { }


  async ngOnInit() {

    // if we come into list component from eg delete route, the map exists and is causing trouble, so delete it and start afresh
    if (this.mapService.isMap()) { this.mapService.kill(); }
    // console.log(this.router.url.split('/').slice(-1)[0]);

    const urlParam = this.router.url.split('/').slice(-1)[0];
    if ( urlParam.length > 10 ) {
      // looks like we were passed a pathId
      this.httpService.getPathById('route', urlParam).subscribe( async (result) => {
        const bbox = result.hills.properties.stats.bbox;
        const centrePoint = {lng: (bbox.maxLng + bbox.minLng) / 2, lat: (bbox.maxLat + bbox.minLat) / 2};
        await this.mapService.newMap(centrePoint);
        this.mapService.add(result.hills, {}, {booEmit: true, booResizeView: true} );
      });
    } else {
      this.mapService.newMap();
    }


    this.pathIdSubscription = this.dataService.pathCommandEmitter.subscribe( ( request ) => {

        if ( request.command === 'add' ) {
          this.httpService.getPathById('route', request.id).subscribe( (result) => {
            this.mapService.add(result.hills, {lineColour: request.colour}, {booEmit: request.emit} );
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
