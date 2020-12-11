import { LocationService } from 'src/app/shared/services/location.service';

import { Component, OnInit, OnDestroy } from '@angular/core';
import { MapCreateService } from 'src/app/shared/services/map-create.service';
import { DataService } from 'src/app/shared/services/data.service';
import { Subscription } from 'rxjs';
import { HttpService } from 'src/app/shared/services/http.service';
import { TsPlotPathOptions, TsCallingPage, TsFeatureCollection, TsLineStyle, TsPosition } from 'src/app/shared/interfaces';
import { ActivatedRoute } from '@angular/router';
import { AlertService } from 'src/app/shared/services/alert.service';


@Component({
  selector: 'app-routes-create',
  templateUrl: './routes-create.component.html',
  styleUrls: ['./routes-create.component.css']
})
export class RoutesCreateComponent implements OnInit, OnDestroy {

  private pathIdListener: Subscription;
  private callingPageListener: Subscription;
  private httpListener: Subscription;

  public callingPage: TsCallingPage;

  constructor(
    private data: DataService,
    public map: MapCreateService,
    private http: HttpService,
    private activatedRoute: ActivatedRoute,
    private alert: AlertService,
    private location: LocationService
    ) { }

  async ngOnInit() {

    this.callingPageListener = this.activatedRoute.data.subscribe( data => {
      this.callingPage = data.callingPage;
    });


    // initialise the map and launch create route
    await this.map.newMap();
    this.map.createRoute();


    // get device location
    this.location.watch(this.map);


    // listen for command from panel-list asking for map changes
    this.pathIdListener = this.data.pathCommandEmitter.subscribe(
      async ( request: {command?: string, id?: string, colour?: string, emit: false, resize: false} ) => {

        if ( request.command === 'add' ) {
          const path = await this.getPath(request.id);
          this.addPathToMap(path, {lineColour: request.colour}, {booEmit: request.emit, booResizeView: request.resize} );

        } else if ( request.command === 'rem' ) {
          this.map.remove(request.id);

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
        console.log(error);
        this.alert.showAsElement(`${error.name}: ${error.name} `, error.message, true, false).subscribe( () => {});

      });

    });

  }


  addPathToMap(pathAsGeojson: TsFeatureCollection, style: TsLineStyle, options: TsPlotPathOptions) {
    this.map.add(pathAsGeojson, style, options );

  }


  ngOnDestroy() {
    if ( this.pathIdListener ) { this.pathIdListener.unsubscribe(); }
    if ( this.callingPageListener ) { this.callingPageListener.unsubscribe(); }
    if ( this.httpListener ) { this.httpListener.unsubscribe(); }
  }


}
