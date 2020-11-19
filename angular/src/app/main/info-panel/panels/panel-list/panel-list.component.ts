
/**
 * Gets list data from the backend, and listens for user click on the displayed list
 * Emits the desired changes to the displayed map (listener is routes-list component)
 */

import { Component, OnInit, OnDestroy, Input, HostListener } from '@angular/core';
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
const LIST_HEIGHT_CORRECTION = 300;

@Component({
  selector: 'app-panel-list',
  templateUrl: './panel-list.component.html',
  styleUrls: ['./panel-list.component.css']
})

export class PanelListComponent implements OnInit, OnDestroy {

  private getListSubscription: Subscription;
  private mapUpdateSubscription: Subscription;
  private dataServiceSubscription: Subscription;

  private offset = 0;               // describes the chunk of the list to request
  private limit: number;

  public nActiveRoutes = 0;
  public numberOfRoutes: number;
  public numberOfLoadedRoutes: number;
  public isEndOfList = false;
  public isPublicOrPrivate = PUBLIC;

  public isRegisteredUser = this.auth.isRegisteredUser();
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
    private router: Router,
    private spinner: SpinnerService
  ) {}



  ngOnInit() {

    // determine the number of list items we can fit in the current view height
    this.limit = Math.floor(((window.innerHeight - LIST_HEIGHT_CORRECTION) / LIST_ITEM_HEIGHT));

    // check url for pathId - if supplied we'll show that path
    const pathId = this.router.url.split('/').slice(-1)[0];
    const isPathId = pathId.length > 10;
    if ( isPathId ) {
      this.activePaths[pathId] = this.highlightColours.shift();
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
      const selectedPaths = this.listItems.filter(listItem => listItem.pathId in this.activePaths);
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
          this.spinner.removeElement();

          // resolve();

      }, (error) => {

        this.spinner.removeElement();
        this.alert.showAsElement('Something went wrong :(', error, true, false)
          .subscribe( () => {});

      });
    // });

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
        emitCommand = {
          command: 'clear'
        };

      } else {

        // reclicked an overlay, just clear the overlay
        this.highlightColours.unshift(this.activePaths[idFromClick]);
        delete this.activePaths[idFromClick];
        emitCommand = {
          command: 'rem',
          id: idFromClick
        };
      }

    } else {

      // new route so add it - only emit pathId from map-service if its the first path selected
      this.activePaths[idFromClick] = this.highlightColours.shift();
      this.nActiveRoutes = Object.keys(this.activePaths).length;

      emitCommand = {
        command: 'add',
        id: idFromClick,
        colour: this.activePaths[idFromClick],
        emit: this.nActiveRoutes === 1
      };

      // this.listItems.splice(this.listItems.indexOf(idFromClick))
      const indx = this.listItems.findIndex( i => i.pathId === idFromClick);
      // console.log(this.listItems.splice(indx, 1));
      this.listItems.splice(this.nActiveRoutes - 1, 0, this.listItems.splice(indx, 1)[0]);


    }

    this.data.pathCommandEmitter.emit( emitCommand );

  }



  getCssClass(id: string, i: number, leftOrRight: string) {

    let classList = '';

    if (i === 0) {
        classList += `border-top list-box-top-${leftOrRight}`;
    } else if (i === this.numberOfLoadedRoutes - 1) {
      classList += `list-box-bottom-${leftOrRight}`;
    }

    // if (this.activePaths[id] === null && leftOrRight === 'right') {
    //   classList += ' red-blue-green';
    // }

    return classList;

  }


  getCssStyle(id: string, i: number, leftOrRight: string) {

    if ( id in this.activePaths ) {
      if ( leftOrRight === 'left' ) {
        return {
          'background-color' : 'whitesmoke',
          // 'border-left': this.activePaths[id] === null ? 'none' : '1px #DEE2E6 solid'

          // 'background-color': this.activePaths[id] === null ? 'whitesmoke' : this.activePaths[id] + this.highlightOpacity
        };
      } else {
        if (this.activePaths[id] === null) {
          switch (leftOrRight) {
            case 'right-top': return {'background-color': 'rgb(255, 127, 127)', 'border-left': '1px #DEE2E6 solid'};
            case 'right-mid': return {'background-color': 'rgb(127, 255, 127)', 'border-left': '1px #DEE2E6 solid'};
            case 'right-bot': return {'background-color': 'rgb(127, 127, 255)', 'border-left': '1px #DEE2E6 solid'};
          }
        } else {
          return {
            'background-color': this.activePaths[id] + this.highlightOpacity,
            'border-left': '1px #DEE2E6 solid'
          };
        }

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

