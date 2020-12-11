import { TsPosition, TsFeatureCollection } from 'src/app/shared/interfaces';
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
    private router: Router,
    // private spinner: SpinnerService,
    private alert: AlertService,
    private location: LocationService
    ) { }


  async ngOnInit() {

    // if we come into list component from eg delete route, the map exists and is causing trouble, so delete it and start afresh
    if (this.map.isMap()) { this.map.kill(); }


    // look for a path id in the url
    const idFromUrl = this.router.url.split('/').slice(-1)[0];
    if ( idFromUrl.length > 10 ) {
      const path = await this.getPath(idFromUrl);

      if (path.properties.info.isPublic) {
        await this.map.newMap(null, null, path.bbox );
        this.addPathToMap(path, {}, {booEmit: true, booResizeView: false});

      } else {
        this.alert.showAsElement('Error: Path not found', 'Could not find the requested path.', true, false).subscribe( () => {});
      }
    } else {

      await this.map.newMap();

    }


    // get device location
    this.map.addPointsLayer('deviceLocation', {
      'circle-radius': 4,
      'circle-opacity': 1,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#523209',
      'circle-color': '#83964B',
    });

    this.location.watch().subscribe( (position: TsPosition) => {
      this.map.addDataToLayer('deviceLocation', 'Point', [position]);
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
        this.map.addDataToLayer('pointHighlighter', 'Point', data.point);
      } else if (data.action === 'centre') {
        this.map.goto(data.point[0]);
      }
    });


    // listen for command from panel-list asking for map changes
    this.pathIdListener = this.data.pathCommandEmitter.subscribe(
      async ( request: {command?: string, id?: string, colour?: string, emit: false, resize: false} ) => {

        if ( request.command === 'add' ) {
          const path = await this.getPath(request.id);
          this.addPathToMap(path, {lineColour: request.colour}, {booEmit: request.emit, booResizeView: request.resize} );

        } else if ( request.command === 'rem' ) {
          this.map.remove(request.id);

        } else if ( request.command === 'replace' ) {
          this.map.clear();
          const path = await this.getPath(request.id);
          this.addPathToMap(path, {lineColour: request.colour}, {booEmit: request.emit, booResizeView: request.resize} );

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

  addPathToMap(pathAsGeojson: TsFeatureCollection, style: TsLineStyle, options: TsPlotPathOptions) {
    this.map.add(pathAsGeojson, style, options );

  }



  ngOnDestroy() {
    if (this.pathIdListener) { this.pathIdListener.unsubscribe(); }
    if (this.httpListener) { this.httpListener.unsubscribe(); }
    if (this.chartPointListener) { this.chartPointListener.unsubscribe(); }
  }

}
