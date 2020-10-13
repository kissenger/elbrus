/**
 * Gets list data from the backend, and listens for user click on the displayed list
 * Emits the desired changes to the displayed map (listener is routes-list component)
 */

import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { HttpService } from 'src/app/shared/services/http.service';
import * as globals from 'src/app/shared/globals';
import { DataService } from 'src/app/shared/services/data.service';
import { Subscription } from 'rxjs';
import { TsUnits, TsListArray, TsBoundingBox, TsCoordinate, TsUser } from 'src/app/shared/interfaces';
import { MapCreateService } from 'src/app/shared/services/map-create.service';
import { AuthService} from 'src/app/shared/services/auth.service';
import { MapService } from 'src/app/shared/services/map.service';
import { AlertService } from 'src/app/shared/services/alert.service';
import { Router } from '@angular/router';

const PRIVATE = false;
const PUBLIC = true;

@Component({
  selector: 'app-panel-list',
  templateUrl: './panel-list.component.html',
  styleUrls: ['./panel-list.component.css']
})

export class PanelListComponent implements OnInit, OnDestroy {

  // @Input() callingPage: string;

  private getListSubscription: Subscription;
  private mapUpdateSubscription: Subscription;
  private dataServiceSubscription: Subscription;

  private offset = 0;               // describes the chunk of the list to request
  private limit = 9;                    // number of paths to request at one time
  public numberOfRoutes: number;
  public numberOfLoadedRoutes: number;
  public isEndOfList = false;
  public isPublicOrPrivate = PUBLIC;

  public isAuthorised = this.auth.isAuthorised();
  public units: TsUnits;
  public home: TsCoordinate;

  private boundingBox: TsBoundingBox = null;
  public activePaths = {};
  public listItems: TsListArray = [];

  private highlightColours = [null, ...globals.lineColours];
  private highlightOpacity = '5A';  // 1E=30%, 32=50%, 4B=75%, 55=85%, 5A=90%

  constructor(
    private http: HttpService,
    private data: DataService,
    private auth: AuthService,
    private alert: AlertService,
    private router: Router
  ) {}



  ngOnInit() {

    // check url for pathId - if supplied we'll show that path
    const pathId = this.router.url.split('/').slice(-1)[0];
    const isPathId = pathId.length > 10;
    if ( isPathId ) {
      this.activePaths[pathId] = this.highlightColours.shift();
    }

    // do some set up
    this.units = this.isAuthorised ? this.auth.getUser().units : globals.defaultUnits;
    if ( this.isAuthorised && !isPathId ) {
      this.isPublicOrPrivate = PRIVATE;
    }

    // subscribe to change in map view
    this.mapUpdateSubscription = this.data.mapBoundsEmitter.subscribe( (bounds: TsBoundingBox) => {
      this.boundingBox = bounds;
      this.offset = 0;
      const selectedPaths = this.listItems.filter(listItem => listItem.pathId in this.activePaths);
      this.addPathsToList(selectedPaths);
    });

    // in case units are changed while viewing the list
    this.dataServiceSubscription = this.data.unitsUpdateEmitter.subscribe( () => {
      this.units = this.isAuthorised ? this.auth.getUser().units : globals.defaultUnits;
    });

  }



  addPathsToList(protectedPaths: TsListArray = null) {

    this.getListSubscription = this.http.getPathsList('route', this.isPublicOrPrivate, this.offset, this.limit, this.boundingBox)

      .subscribe( result => {

        // get a full list of existing and backend results
        const backendList = result.list;
        const count = result.count;
        const temp = protectedPaths ? protectedPaths : this.listItems;
        const fullList = [...temp, ...backendList];

        // filter out duplicates
        const fullListPathIds = fullList.map( item => item.pathId );
        const filteredList = fullList.filter( (item, i) => fullListPathIds.indexOf(item.pathId) === i );
        this.listItems = filteredList;

        // work out the numbers
        this.numberOfRoutes = count - backendList.length - (this.offset * this.limit)  + filteredList.length;
        this.numberOfLoadedRoutes = this.listItems.length;
        this.isEndOfList = this.numberOfLoadedRoutes === this.numberOfRoutes;

    }, (error) => {

      this.alert.showAsElement('Something went wrong :(', error, true, false)
        .subscribe( () => {});

    });

  }



  onMoreClick() {
    this.offset++;
    this.addPathsToList();
  }


  onSelectMenuChange() {
    this.offset = 0;
    // this.listItems = [];
    this.addPathsToList();
  }


  onListClick(idFromClick: string) {

    let emitCommand: Object;

    if ( idFromClick in this.activePaths ) {

      if ( this.activePaths[idFromClick] === null ) {

        // reclicked on first route, clear it and all overlays
        this.highlightColours = [null, ...globals.lineColours];
        this.activePaths = {};
        emitCommand = { command: 'clear' };

      } else {

        // reclicked an overlay, just clear the overlay
        this.highlightColours.unshift(this.activePaths[idFromClick]);
        delete this.activePaths[idFromClick];
        emitCommand = { command: 'rem', id: idFromClick };
      }

    } else {

      // new route so add it
      this.activePaths[idFromClick] = this.highlightColours.shift();
      emitCommand = {
        command: 'add',
        id: idFromClick,
        colour: this.activePaths[idFromClick],
        emit: Object.keys(this.activePaths).length < 2
      };

    }

    this.data.pathIdEmitter.emit( emitCommand );

  }



  getCssClass(id: string, i: number, leftOrRight: string) {

    if (i === 0) {
        return `border-top mt-1 list-box-top-${leftOrRight}`;
    } else if (i === this.numberOfLoadedRoutes - 1) {
        return `list-box-bottom-${leftOrRight}`;
    }

  }


  getCssStyle(id: string, i: number, leftOrRight: string) {

    if ( id in this.activePaths ) {
      if ( leftOrRight === 'left' ) {
        return {'background-color' : 'whitesmoke'};
      } else {
        return { 'background-color': this.activePaths[id] === null ? 'whitesmoke' : this.activePaths[id] + this.highlightOpacity };
      }

    } else {
      return '';
    }

  }




  /**
   * Actions to do when component is destroyed
   */
  ngOnDestroy() {
    if (this.getListSubscription) { this.getListSubscription.unsubscribe(); }
    if (this.mapUpdateSubscription) { this.mapUpdateSubscription.unsubscribe(); }
    if (this.dataServiceSubscription) { this.dataServiceSubscription.unsubscribe(); }
  }


}

