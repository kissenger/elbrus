
/**
 * Gets list data from the backend, and listens for user click on the displayed list
 * Emits the desired changes to the displayed map (listener is routes-list component)
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpService } from 'src/app/shared/services/http.service';
import * as globals from 'src/app/shared/globals';
import { DataService } from 'src/app/shared/services/data.service';
import { Subscription } from 'rxjs';
import { TsUnits, TsListArray, TsBoundingBox, TsCoordinate, TsUser } from 'src/app/shared/interfaces';
import { AuthService} from 'src/app/shared/services/auth.service';
import { AlertService } from 'src/app/shared/services/alert.service';
import { Router } from '@angular/router';
import { SpinnerService } from 'src/app/shared/services/spinner.service';
import { __classPrivateFieldSet } from 'tslib';

const PRIVATE = false;
const PUBLIC = true;
const LIST_ITEM_HEIGHT = 37;
const LIST_HEIGHT_CORRECTION = 400;  // higher number results in fewer routes loaded

@Component({
  selector: 'app-panel-list',
  templateUrl: './panel-list.component.html',
  styleUrls: ['./panel-list.component.css']
})

export class PanelListComponent implements OnInit, OnDestroy {

  private getListSubscription: Subscription;
  private mapUpdateSubscription: Subscription;
  private dataServiceSubscription: Subscription;

  // keep track of the routes user has selected
  public nSelectedRoutes = 0;
  public selectedPaths = {};

  // define the colours to highlight overlays
  private highlightColours = [null, ...globals.lineColours];
  private highlightOpacity = '5A';  // 1E=30%, 32=50%, 4B=75%, 55=85%, 5A=90%

  // keep track of the number of routes available compared to the number loades
  public nRoutesInView: number;
  public nLoadedRoutes: number;
  private nRoutesToLoad: number;
  private offset = 0;
  public isAllRoutesLoaded = false;
  public isPublicOrPrivate = PUBLIC;   // state of the dropdown box
  private boundingBox: TsBoundingBox = null;    // current view
  public listItems: TsListArray = [];

  // keep track of user and preferences
  public isRegisteredUser = this.auth.isRegisteredUser();
  public units: TsUnits;
  public home: TsCoordinate;

  constructor(
    private http: HttpService,
    private data: DataService,
    private auth: AuthService,
    private alert: AlertService,
    private router: Router,
    private spinner: SpinnerService
  ) {}

  ngOnInit() {

    // determine the number of list items we can fit in the current view height
    this.nRoutesToLoad = Math.floor(((window.innerHeight - LIST_HEIGHT_CORRECTION) / LIST_ITEM_HEIGHT));

    // check url for pathId - if supplied we'll show that path
    const pathId = this.router.url.split('/').slice(-1)[0];
    const isPathId = pathId.length > 10;
    if ( isPathId ) {
      this.selectedPaths[pathId] = this.highlightColours.shift();
    }

    // do some set up
    this.units = this.isRegisteredUser ? this.auth.getUser().units : globals.defaultUnits;
    if ( this.isRegisteredUser && !isPathId ) {
      this.isPublicOrPrivate = PRIVATE;
    }

    // subscribe to change in map view
    this.mapUpdateSubscription = this.data.mapBoundsEmitter.subscribe( (bounds: TsBoundingBox) => {
      this.boundingBox = bounds;
      this.offset = 0;
      const selectedPaths = this.listItems.filter(listItem => listItem.pathId in this.selectedPaths);
      this.addPathsToList(selectedPaths);
    });

    // in case units are changed while viewing the list
    this.dataServiceSubscription = this.data.unitsUpdateEmitter.subscribe( () => {
      this.units = this.isRegisteredUser ? this.auth.getUser().units : globals.defaultUnits;
    });

  }



  addPathsToList(protectedPaths: TsListArray = null) {

    // return new Promise( (resolve, reject) => {
      this.spinner.showAsElement();

      this.getListSubscription = this.http.getPathsList('route', this.isPublicOrPrivate, this.offset, this.nRoutesToLoad, this.boundingBox)

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
          this.nRoutesInView = count - backendList.length - (this.offset * this.nRoutesToLoad)  + filteredList.length;
          this.nLoadedRoutes = this.listItems.length;
          this.isAllRoutesLoaded = this.nLoadedRoutes === this.nRoutesInView;
          this.spinner.removeElement();

          // resolve();

      }, (error) => {

        this.spinner.removeElement();
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
    this.addPathsToList();
  }


  onListClick(idFromClick: string) {

    let emitCommand: Object;

    if ( idFromClick in this.selectedPaths) {

      if ( this.selectedPaths[idFromClick] === null ) {

        // reclicked on first route, clear it and all overlays
        this.highlightColours = [null, ...globals.lineColours];
        this.selectedPaths = {};
        this.nSelectedRoutes = 0;

        // make changes to map
        emitCommand = {
          command: 'clear'
        };

      } else {

        // reclicked an overlay, just clear the overlay
        this.highlightColours.unshift(this.selectedPaths[idFromClick]);
        delete this.selectedPaths[idFromClick];
        this.nSelectedRoutes = Object.keys(this.selectedPaths).length;

        // make changes to map
        emitCommand = {
          command: 'rem',
          id: idFromClick
        };
      }

    } else {

      // new route so add it - only emit pathId from map-service if its the first path selected
      this.selectedPaths[idFromClick] = this.highlightColours.shift();
      this.nSelectedRoutes = Object.keys(this.selectedPaths).length;

      // make changes to map
      emitCommand = {
        command: 'add',
        id: idFromClick,
        colour: this.selectedPaths[idFromClick],
        emit: this.nSelectedRoutes === 1
      };

      // bump selected item to the top of the list
      if ( this.nSelectedRoutes === 1 ) {
        const indx = this.listItems.findIndex( i => i.pathId === idFromClick);
        this.listItems.splice(this.nSelectedRoutes - 1, 0, this.listItems.splice(indx, 1)[0]);
      }

    }

    this.data.pathCommandEmitter.emit( emitCommand );

  }


  /** Set syles for list items based on position in list, and whether route is selected. */
  getCssStyle(id: string, i: number) {

    const styles = {};

    styles['border-left'] = '1px #DEE2E6 solid';
    styles['border-right'] = '1px #DEE2E6 solid';
    styles['border-bottom'] = '1px #DEE2E6 solid';
    styles['border-top'] = i === 0 ? '1px #DEE2E6 solid' : 'none';

    // if ( i === 0 ) {
    //   styles['border-top'] = '1px #DEE2E6 solid';
    // }


    // if ( this.nSelectedRoutes > 0 ) {
    //   styles['border-top'] = i === 1 ? '1px #DEE2E6 solid' : 'none';
    //   styles['background-color'] = i === 0 ? 'whitesmoke' : 'none';

    // }

    if ( id in this.selectedPaths) {
      styles['background-color'] = this.selectedPaths[id] + this.highlightOpacity;
    }

    return styles;

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

