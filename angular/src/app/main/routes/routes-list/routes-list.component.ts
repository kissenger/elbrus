import { AuthService } from './../../../shared/services/auth.service';
import { TsPosition, TsFeatureCollection, TsMapRequest } from 'src/app/shared/interfaces';
/**
 * Listens for request from panel-list component, makes the backend request and uses
 * map-service to make the desired changes to the plot
 */

import { HttpService } from './../../../shared/services/http.service';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { MapService } from 'src/app/shared/services/map.service';
import { DataService } from 'src/app/shared/services/data.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { SpinnerService } from 'src/app/shared/services/spinner.service';
import { AlertService } from 'src/app/shared/services/alert.service';
import { TsLineStyle, TsPlotPathOptions } from 'src/app/shared/interfaces';
import { LocationService } from 'src/app/shared/services/location.service';

@Component({
  selector: 'app-routes',
  templateUrl: './routes-list.component.html',
  styleUrls: ['./routes-list.component.css']
})

export class RoutesListComponent implements OnInit, OnDestroy {

  private pathIdListener: Subscription;
  private httpListener: Subscription;
  private chartPointListener: Subscription;
  public tsMap;

  constructor(
    private data: DataService,
    public map: MapService,
    private http: HttpService,
    private alert: AlertService,
    private location: LocationService,
    private auth: AuthService
    ) { }


  async ngOnInit() {

    // if we come into list component from eg delete route, the map exists and is causing trouble, so delete it and start afresh
    if (this.map.isMap()) { this.map.kill(); }

    // look for a stored pathId - if present we need to display it.  PathId is set in stored by AuthGuard
    const idFromStore = this.data.get('pathId');

    if (idFromStore) {
      this.data.clearKey('pathId');
      const path = await this.getPath(idFromStore);

      // allow if createdBy this user, or if public
      if (path.properties.info.isPublic || this.auth.getUser().userName === path.properties.info.createdBy) {

        this.data.setPath(path);
        this.data.set({startPath: true}); // tells panel-list that we are showing a shared path
        await this.map.newMap(null, null, path.bbox );
        this.map.add(path, {}, {plotType: 'active'});

      } else {
        this.alert.showAsElement('Error: Path not found', 'Couldn\'t find requested path, or not authorised', true, false)
          .subscribe( () => {});
      await this.map.newMap();

      }

    } else {
      // must set the path even if there isnt one because panel-list is waiting for it
      // this.data.setPath(null);
      await this.map.newMap();

    }


    // get device location
    this.location.watch(this.map);

    // listen for coordinate from chart and plot on map
    this.map.addPointsLayer('pointHighlighter', {
      'circle-radius': 8,
      'circle-opacity': 0.3,
      'circle-stroke-width': 1,
      'circle-color': '#FF0000',
    });
    this.chartPointListener = this.data.chartPointEmitter.subscribe( (data) => {
      if (data.action === 'show') {
        this.map.setLayerData('pointHighlighter', 'Point', data.point);
      } else if (data.action === 'centre') {
        this.map.goto(data.point[0]);
      }
    });


    // listen for command from panel-list asking for map changes
    this.pathIdListener = this.data.pathCommandEmitter.subscribe(
      async ( request: TsMapRequest ) => {

        if ( request.command === 'add' ) {
          const path = await this.getPath(request.pathId);
          this.map.add(path, {lineColour: request.colour}, {plotType: request.plotType, resizeView: false} );

        } else if ( request.command === 'rem' ) {
          this.map.remove(request.pathId);

        } else if ( request.command === 'replace' ) {
          this.map.clear();
          const path = await this.getPath(request.pathId);
          this.map.add(path, {lineColour: request.colour}, {plotType: request.plotType, resizeView: false} );
        }
    });
  }

  // getPosition(): Promise<any> {

  //   return new Promise((resolve, reject) => {

  //     navigator.geolocation.getCurrentPosition(resp => {

  //         resolve(<TsCoordinate>{lng: resp.coords.longitude, lat: resp.coords.latitude});
  //       },
  //       err => {
  //         reject(err);
  //       });
  //   });

  // }



  /** get a path id from the backend */
  getPath(pathId: string) {

    return new Promise<TsFeatureCollection>( (resolve, reject) => {

      this.httpListener = this.http.getPathById('route', pathId).subscribe( async (result) => {
        resolve(result.hills);

      }, (error) => {
        reject();
        console.log(error);
        this.alert.showAsElement(`${error.name}: ${error.name} `, error.message, true, false).subscribe( () => {});

      });

    });

  }

  // addPathToMap(pathAsGeojson: TsFeatureCollection, style: TsLineStyle, options: TsPlotPathOptions) {
  //   this.map.add(pathAsGeojson, style, options );

  // }



  ngOnDestroy() {
    if (this.pathIdListener) { this.pathIdListener.unsubscribe(); }
    if (this.httpListener) { this.httpListener.unsubscribe(); }
    if (this.chartPointListener) { this.chartPointListener.unsubscribe(); }
  }

}
