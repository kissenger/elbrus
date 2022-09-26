import { AuthService } from './../../../shared/services/auth.service';
import { PositionService } from 'src/app/shared/services/position.service';

import { Component, OnInit, OnDestroy } from '@angular/core';
import { MapCreateService } from 'src/app/shared/services/map-create.service';
import { DataService } from 'src/app/shared/services/data.service';
import { Subscription } from 'rxjs';
import { HttpService } from 'src/app/shared/services/http.service';
import { TsPlotPathOptions, TsFeatureCollection, TsLineStyle, TsMapRequest, TsCallingPage } from 'src/app/shared/interfaces';
import { AlertService } from 'src/app/shared/services/alert.service';
import * as globals from 'src/app/shared/globals';
import { ScreenSizeService } from 'src/app/shared/services/screen-size.service';
import { ActivatedRoute, Router } from '@angular/router';


@Component({
  selector: 'app-routes-create',
  templateUrl: './routes-create.component.html',
  styleUrls: ['./routes-create.component.css']
})
export class RoutesCreateComponent implements OnInit, OnDestroy {

  private pathIdListener: Subscription;
  private httpListener: Subscription;
  private chartPointListener: Subscription;
  private positionListener: Subscription;
  private routeListener: Subscription;

  public windowWidth: number;
  public BREAKPOINT = globals.BREAKPOINTS.MD;

  constructor(
    private data: DataService,
    private route: ActivatedRoute,
    private router: Router,
    public map: MapCreateService,
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

    // redirect if in edit mode and there is no stored route (browser was refreshed)
    this.routeListener = this.route.data.subscribe( data => {
      if (data.callingPage === 'edit' && !this.data.getPath()) {
        this.router.navigate(['/routes/list']);
      }
    })

    // initialise the map and launch create route
    if (this.map.isMap()) { this.map.kill(); }
    await this.map.newMap();
    this.map.createRoute();
    // initiate position watch
    this.position.watch();
    this.positionListener = this.data.positionEmitter.subscribe( () => {
      this.map.updatePosition(this.data.get('devicePosition'), this.data.get('deviceAccuracy'));
    });

    if ( this.auth.isGuest ) {
      this.alert.showAsElement(`Warning: Route will not be saved`,
      'Routes created as using guest account cannot be saved.  If you wish to save your route, please log in.'
      , true, false).subscribe( () => {});
    }

    // listen for command from panel-list asking for map changes
    this.pathIdListener = this.data.pathCommandEmitter.subscribe(
      async ( request: TsMapRequest ) => {

        if ( request.command === 'add' ) {
          const path = await this.getPath(request.pathId);
          this.map.add(path, {lineColour: request.colour}, {plotType: request.plotType, resizeView: false} );

        } else if ( request.command === 'rem' ) {
          this.map.remove(request.pathId);

        }
    });

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

  }


  /** get a path id from the backend */
  getPath(pathId: string) {

    return new Promise<TsFeatureCollection>( (resolve, reject) => {

      this.httpListener = this.http.getPathById('route', pathId).subscribe(
        async (result) => { resolve(result.hills); },
        (error) => {
          reject();
          // console.log(error);
          // this.alert.showAsElement(`${error.name}: ${error.name} `, error.message, true, false).subscribe( () => {});
        }
      );

    });

  }


  ngOnDestroy() {
    if ( this.pathIdListener ) { this.pathIdListener.unsubscribe(); }
    if ( this.httpListener ) { this.httpListener.unsubscribe(); }
    if ( this.chartPointListener ) { this.chartPointListener.unsubscribe(); }
    if ( this.positionListener ) { this.positionListener.unsubscribe(); }
  }


}
