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

@Component({
  selector: 'app-routes',
  templateUrl: './routes-list.component.html',
  styleUrls: ['./routes-list.component.css']
})

export class RoutesListComponent implements OnInit, OnDestroy {

  private pathIdListener: Subscription;
  private httpListener: Subscription;

  constructor(
    private data: DataService,
    private map: MapService,
    private http: HttpService,
    private router: Router,
    private spinner: SpinnerService,
    private alert: AlertService
    ) { }


  async ngOnInit() {

    // if we come into list component from eg delete route, the map exists and is causing trouble, so delete it and start afresh
    if (this.map.isMap()) { this.map.kill(); }

    // look for a path id in the url
    const urlParam = this.router.url.split('/').slice(-1)[0];
    if ( urlParam.length > 10 ) {

      await this.map.newMap();
      this.plotPath(urlParam, {}, {booEmit: true, booResizeView: true});

    } else {
      this.map.newMap();
    }


    this.pathIdListener = this.data.pathCommandEmitter.subscribe(
      async ( request: {command?: string, id?: string, colour?: string, emit?: boolean} ) => {

        if ( request.command === 'add' ) {
          await this.plotPath(request.id, {lineColour: request.colour}, {booEmit: request.emit} );

        } else if ( request.command === 'rem' ) {
          await this.map.remove(request.id);

        } else if ( request.command === 'clear' ) {
          await this.map.clear();

        }

    });
  }

  /** get a path id from the backend and get it plotted on the map */
  plotPath(pathId: string, style: TsLineStyle, options: TsPlotPathOptions) {

    return new Promise( (resolve, reject) => {

      this.spinner.showAsElement();
      this.httpListener = this.http.getPathById('route', pathId).subscribe( async (result) => {

        await this.map.add(result.hills, style, options );
        this.spinner.removeElement();
        resolve();

      }, (error) => {
        this.spinner.removeElement();
        reject();
        this.alert.showAsElement('Something went wrong :(', error, true, false).subscribe( () => {} );
      });

    });

  }

  ngOnDestroy() {
    if (this.pathIdListener) { this.pathIdListener.unsubscribe(); }
    if (this.httpListener) { this.httpListener.unsubscribe(); }
  }

}
