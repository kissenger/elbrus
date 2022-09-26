import { TsCallingPageType, TsPosition } from './../../../shared/interfaces';
import { ScreenSizeService } from './../../../shared/services/screen-size.service';
import { AuthService } from './../../../shared/services/auth.service';
import { TsFeatureCollection, TsMapRequest } from 'src/app/shared/interfaces';
/**
 * Listens for request from panel-list component, makes the backend request and uses
 * map-service to make the desired changes to the plot
 */

import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { HttpService } from 'src/app/shared/services/http.service';
import { MapService } from 'src/app/shared/services/map.service';
import { DataService } from 'src/app/shared/services/data.service';
import { Subscription } from 'rxjs';
import { AlertService } from 'src/app/shared/services/alert.service';
import { PositionService } from 'src/app/shared/services/position.service';
import { TsMarkers } from 'src/app/shared/classes/ts-markers';
import * as globals from 'src/app/shared/globals';

@Component({
  selector: 'app-routes',
  templateUrl: './routes-list.component.html',
  styleUrls: ['./routes-list.component.css']
})

export class RoutesListComponent implements OnInit, OnDestroy {

  @Input() callingPage: TsCallingPageType;

  private pathIdListener: Subscription;
  private httpListener: Subscription;
  private chartPointListener: Subscription;
  private positionListener: Subscription;
  private tsMap: mapboxgl.Map;        // needed, dont delete
  private markers = new TsMarkers();  // needed, dont delete
  public windowWidth: number;
  public BREAKPOINT = globals.BREAKPOINTS.MD;
  private startPosition: TsPosition = null;

  constructor(
    private data: DataService,
    public map: MapService,  // map service
    private http: HttpService,
    private alert: AlertService,
    private position: PositionService,
    private auth: AuthService,
    private screenSize: ScreenSizeService
    ) {
      this.windowWidth = this.screenSize.width;
      this.screenSize.resize.subscribe( (newWidth: {width: number, height: number}) => {
        this.windowWidth = newWidth.width;
      });
     }

  async ngOnInit() {

    // if we come into list component from eg delete route, the map exists and is causing trouble, so delete it and start afresh
    if (this.map.isMap()) { this.map.kill(); }

    // get current position if user is guest, so we can initiate the map with it
    if (this.auth.isGuest) {
      this.startPosition = await this.position.current;
    }


    // look for a stored pathId - if present we need to display it.  PathId is set in stored by AuthGuard
    const idFromStore = this.data.get('pathId');

    if (idFromStore) {
      this.data.clearKey('pathId');
      const path = await this.getPath(idFromStore);

      // allow if createdBy this user, or if public
      if (path.properties.info.isPublic || this.auth.user.userName === path.properties.info.createdBy) {

        this.data.setPath(path);
        this.data.set({startPath: true}); // tells panel-list that we are showing a shared path
        this.tsMap = await this.map.newMap(null, null, path.bbox );
        this.map.add(path, {}, {plotType: 'active', resizeView: true});

      } else {
        this.alert.showAsElement('Error: Path not found', 'Couldn\'t find requested path, or not authorised', true, false)
          .subscribe( () => {});
          this.tsMap = await this.map.newMap(this.startPosition, 12);
      }

    } else {

      this.tsMap = await this.map.newMap(this.startPosition, 12);

    }


    // initiate position watch
    this.position.watch();
    this.positionListener = this.data.positionEmitter.subscribe( () => {
      this.map.updatePosition(this.data.get('devicePosition'), this.data.get('deviceAccuracy'));
    });


    if ( this.auth.isGuest ) {
      this.alert.showAsElement(`Welcome Guest!`,
      'Thanks for having a look at trailscape.  Just to let you know, as a guest you\'ll only have a limited set of features.' +
      '  When you\'re ready, log in for full access.'
      , true, false).subscribe( () => {});
    }



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
        } else if ( request.command === 'clear' ) {
          this.map.clear();
        }
    });
  }

  /** get a path id from the backend */
  getPath(pathId: string) {

    return new Promise<TsFeatureCollection>( (resolve, reject) => {

      this.httpListener = this.http.getPathById('route', pathId).subscribe( async (result) => {
        resolve(result.hills);

      }, (error) => {
        reject();
        // console.log(error);
        // this.alert.showAsElement(`${error.name}: ${error.name} `, error.message, true, false).subscribe( () => {});

      });

    });

  }


  ngOnDestroy() {
    if (this.pathIdListener) { this.pathIdListener.unsubscribe(); }
    if (this.httpListener) { this.httpListener.unsubscribe(); }
    if (this.chartPointListener) { this.chartPointListener.unsubscribe(); }
    if (this.positionListener) { this.positionListener.unsubscribe(); }
    this.position.unwatch();
    this.alert.removeElement();

  }

}
