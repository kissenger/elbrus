
import { Component, OnInit, OnDestroy } from '@angular/core';
import { MapCreateService } from 'src/app/shared/services/map-create.service';
import { DataService } from 'src/app/shared/services/data.service';
import * as globals from 'src/app/shared/globals';
import { Subscription } from 'rxjs';
import { HttpService } from 'src/app/shared/services/http.service';
import { TsPlotPathOptions, TsCallingPage } from 'src/app/shared/interfaces';
import { ActivatedRoute } from '@angular/router';


@Component({
  selector: 'app-routes-create',
  templateUrl: './routes-create.component.html',
  styleUrls: ['./routes-create.component.css']
})
export class RoutesCreateComponent implements OnInit, OnDestroy {

  private menuListener: Subscription;
  private overlayListener: Subscription;
  private callingPageListener: Subscription;

  private overlaidPaths = [];
  private overlayPlotOptions: TsPlotPathOptions = {
    booResizeView: false,
    booEmit: false
  };
  public callingPage: TsCallingPage;

  constructor(
    private data: DataService,
    public map: MapCreateService,
    private http: HttpService,
    private activatedRoute: ActivatedRoute
    ) { }

  ngOnInit() {

    this.callingPageListener = this.activatedRoute.data.subscribe( data => {
      this.callingPage = data.callingPage;
    });

    // initialise the map and launch createroute
    this.map.newMap().then( () => {
      this.map.createRoute();
    });


    // listen for pathID emission from panel-routes-list-list, and get the path from the backend
    // TODO: I **think** this can be refactored to remove needing to search through the overlaidPaths,
    // or even to keep track of them because the subscribed to seervice now sends whether a resizze of the
    // view is required --> but works for now
    this.overlayListener = this.data.pathCommandEmitter.subscribe( (obj) => {

      const pathId = obj.id;

      // if pathId is not in overlaidPaths then add it
      if (!this.overlaidPaths.includes(pathId)) {
        this.http.getPathById('route', pathId).subscribe( (result) => {
          this.map.remove(pathId);
          this.map.add(result.basic, globals.overlayLineStyle, this.overlayPlotOptions);
          this.overlaidPaths.push(pathId);
        });

      // otherwise pathID is present, so remove from map and delete key from object
      } else {
        this.map.remove(pathId);
        this.overlaidPaths.splice(this.overlaidPaths.indexOf(pathId), 1);
      }

    });


  }

  ngOnDestroy() {
    if ( this.menuListener ) { this.menuListener.unsubscribe(); }
    if ( this.overlayListener ) { this.overlayListener.unsubscribe(); }
    if ( this.callingPageListener ) { this.callingPageListener.unsubscribe(); }
    this.map.clear();
  }


}
