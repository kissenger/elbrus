import { Component, OnInit, OnDestroy } from '@angular/core';
import { MapCreateService } from 'src/app/shared/services/map-create.service';
import { DataService } from 'src/app/shared/services/data.service';
import * as globals from 'src/app/shared/globals';
import { Subscription } from 'rxjs';
import { HttpService } from 'src/app/shared/services/http.service';
import { TsPlotPathOptions, TsLineStyle, TsCoordinate } from 'src/app/shared/interfaces';
import { Router, ActivatedRoute } from '@angular/router';


@Component({
  selector: 'app-routes-create',
  templateUrl: './routes-create.component.html',
  styleUrls: ['./routes-create.component.css']
})
export class RoutesCreateComponent implements OnInit, OnDestroy {

  private menuSubscription: Subscription;
  private overlaySubscription: Subscription;
  private callingPageSubscription: Subscription;
  private overlaidPaths = [];
  private overlayPlotOptions: TsPlotPathOptions = {
    booResizeView: false,
    booSaveToStore: false,
    booPlotMarkers: false
  };
  public callingPage: string;

  constructor(
    private dataService: DataService,
    private mapCreateService: MapCreateService,
    private httpService: HttpService,
    private router: Router,
    private activatedRoute: ActivatedRoute
    ) { }

  ngOnInit() {
    // this.router.navigate(['/route/list']);
    // centre map on the currently loading route if it exists, otherwise take users home location
    // mapview is set by map.service
    const mapView = this.dataService.getFromStore('mapView', true);
    let startPosition: TsCoordinate;
    let startZoom: number;

    if ( !mapView ) {
      this.mapCreateService.clear();
      this.router.navigate(['/route/list']);
    } else {
      startPosition = mapView ? mapView.centre : <TsCoordinate>{lat: -999, lng: -999};
      startZoom = mapView ? mapView.zoom : 5;
    }

    this.callingPageSubscription = this.activatedRoute.data.subscribe( data => {
      this.callingPage = data.callingPage;
    });

    // initialise the map and launch createroute
    this.mapCreateService.newMap(startPosition, startZoom).then( () => {
      this.mapCreateService.createRoute();
    });

    // listen for menu commands
    this.menuSubscription = this.dataService.menuClickEmitter.subscribe( (fromMenu) => {
      if (fromMenu.command) {
        if (fromMenu.command === 'undo') { this.mapCreateService.undo(); }
        if (fromMenu.command === 'close') { this.mapCreateService.closePath(); }
        if (fromMenu.command === 'clear') { this.mapCreateService.undoAll(); }
        if (fromMenu.command === 'reverse') { this.mapCreateService.reversePath(); }
        if (fromMenu.command === 'simplify') { this.mapCreateService.simplify(); }
      } else {
        const optionKey = Object.keys(fromMenu.option)[0];
        this.mapCreateService.options = fromMenu.option[optionKey];
      }
    });

    // listen for pathID emission from panel-routes-list-list, and get the path from the backend
    // TODO: I **think** this can be refactored to remove needing to search through the overlaidPaths,
    // or even to keep track of them because the subscribed to seervice now sends whether a resizze of the
    // view is required --> but works for now
    this.overlaySubscription = this.dataService.pathIdEmitter.subscribe( (obj) => {

      const pathId = obj.id;

      // if pathId is not in overlaidPaths then add it
      if (!this.overlaidPaths.includes(pathId)) {
        this.httpService.getPathById('route', pathId).subscribe( (result) => {
          this.mapCreateService.remove(pathId);
          this.mapCreateService.add(result.basic, globals.overlayLineStyle, this.overlayPlotOptions);
          this.overlaidPaths.push(pathId);
        });

      // otherwise pathID is present, so remove from map and delete key from object
      } else {
        this.mapCreateService.remove(pathId);
        this.overlaidPaths.splice(this.overlaidPaths.indexOf(pathId), 1);
      }

    });


  }

  ngOnDestroy() {
    if ( this.menuSubscription ) { this.menuSubscription.unsubscribe(); }
    if ( this.overlaySubscription ) { this.overlaySubscription.unsubscribe(); }
    if ( this.callingPageSubscription ) { this.callingPageSubscription.unsubscribe(); }
    this.mapCreateService.clear();
  }


}
