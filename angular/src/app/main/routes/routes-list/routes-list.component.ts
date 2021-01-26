import { ScreenSizeService } from './../../../shared/services/screen-size.service';
import { AuthService } from './../../../shared/services/auth.service';
import { TsFeatureCollection, TsMapRequest } from 'src/app/shared/interfaces';
/**
 * Listens for request from panel-list component, makes the backend request and uses
 * map-service to make the desired changes to the plot
 */

import { HttpService } from './../../../shared/services/http.service';
import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { MapService } from 'src/app/shared/services/map.service';
import { DataService } from 'src/app/shared/services/data.service';
import { Subscription } from 'rxjs';
import { AlertService } from 'src/app/shared/services/alert.service';
import { LocationService } from 'src/app/shared/services/location.service';
import { TsMarkers } from 'src/app/shared/classes/ts-markers';
import * as globals from 'src/app/shared/globals';

@Component({
  selector: 'app-routes',
  templateUrl: './routes-list.component.html',
  styleUrls: ['./routes-list.component.css']
})

export class RoutesListComponent implements OnInit, OnDestroy {

  private pathIdListener: Subscription;
  private httpListener: Subscription;
  private chartPointListener: Subscription;
  private tsMap: mapboxgl.Map;        // needed, dont delete
  private markers = new TsMarkers();  // needed, dont delete
  public windowWidth: number;
  public isDraggableOpen = false;
  public BREAKPOINT = globals.BREAKPOINTS.MD;

  constructor(
    private data: DataService,
    public map: MapService,  // map service
    private http: HttpService,
    private alert: AlertService,
    private location: LocationService,
    private auth: AuthService,
    private screenSize: ScreenSizeService
    ) {
     }


  async ngOnInit() {

    this.windowWidth = this.screenSize.width;
    this.screenSize.resize.subscribe( (newWidth: {width: number, height: number}) => {
      this.windowWidth = newWidth.width;
    });

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
        this.tsMap = await this.map.newMap(null, null, path.bbox );
        this.map.add(path, {}, {plotType: 'active'});

      } else {
        this.alert.showAsElement('Error: Path not found', 'Couldn\'t find requested path, or not authorised', true, false)
          .subscribe( () => {});
          this.tsMap = await this.map.newMap();
      }

    } else {

      this.tsMap = await this.map.newMap();

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
        } else if ( request.command === 'clear' ) {
          this.map.clear();
        }
    });
  }

  onDraggableClick() {
    this.isDraggableOpen = !this.isDraggableOpen;
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

  // addPathToMap(pathAsGeojson: TsFeatureCollection, style: TsLineStyle, options: TsPlotPathOptions) {
  //   this.map.add(pathAsGeojson, style, options );

  // }



  ngOnDestroy() {
    if (this.pathIdListener) { this.pathIdListener.unsubscribe(); }
    if (this.httpListener) { this.httpListener.unsubscribe(); }
    if (this.chartPointListener) { this.chartPointListener.unsubscribe(); }

  }

}
