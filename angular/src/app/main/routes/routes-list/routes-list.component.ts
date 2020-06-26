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
  private overlaidPaths = [];
  // private plotOptions: TsPlotPathOptions = {
  //   booResizeView: false,
  //   booSaveToStore: true,
  //   booPlotMarkers: true
  // };
  private overlayPlotOptions: TsPlotPathOptions = {
    booResizeView: false,
    booSaveToStore: false,
    booPlotMarkers: false,
  };
  // private lineStyle: TsLineStyle = {}; // take lineStyle from geoJSON


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

    // if we come into list component from eg delete route, the map exists and is causing trouble, so delete it and start afresh
    if (this.mapService.isMap()) { this.mapService.kill(); }

    this.mapService.newMap();

    // listen for pathID emission from panel-routes-list-list, and get the path from the backend
    this.pathIdSubscription = this.dataService.pathIdEmitter.subscribe( (obj) => {

      const pathId = obj.id;
      const lineColour = obj.colour;
      console.log(obj)
      // const isOverlay = obj.isOverlay;
      // this.plotOptions.booResizeView = obj.booResizeView;

      if (pathId === '0') {

        // no path id found so default to users default location
        // this.mapService.newMap();

      } else {

        // this.httpService.getPathById('route', pathId).subscribe( (result) => {

          // if ( isOverlay ) {
            if (!this.overlaidPaths.includes(pathId)) {

              console.log(this.overlaidPaths);
              console.log(lineColour)

              this.httpService.getPathById('route', pathId).subscribe( (result) => {
                this.mapService.remove(pathId);
                const lineStyle = this.overlaidPaths.length === 0 ? {} : {lineColour: lineColour} ;
                console.log(lineColour)
                this.mapService.add(result.hills, lineStyle, this.overlayPlotOptions);
                this.overlaidPaths.push(pathId);

              });

            // otherwise pathID is present, so remove from map and delete key from object
            } else {

              this.mapService.remove(pathId);
              this.overlaidPaths.splice(this.overlaidPaths.indexOf(pathId), 1);

            }

          // } else {
          //   this.httpService.getPathById('route', pathId).subscribe( (result) => {
          //     this.geoJSON = result.hills;

          //     // as initialisation will temporarily show default location, only run it if map doesnt currently exist
          //     this.initialiseMapIfNeeded().then( () => {
          //       this.mapService.clear();
          //       this.mapService.add(this.geoJSON, this.lineStyle, this.plotOptions);
          //     });

          //   });

          // }



        // });
      }
    });
  }

  /**
   * checks if map already exists, and if not then create it and wait for it to load
   */
  initialiseMapIfNeeded() {

    return new Promise( (resolve, reject) => {

      if ( !this.mapService.isMap() ) {

        const cog = {
          lng: ( this.geoJSON.bbox[0] + this.geoJSON.bbox[2] ) / 2,
          lat: ( this.geoJSON.bbox[1] + this.geoJSON.bbox[3] ) / 2 };

        this.mapService.newMap(cog, 10)
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
