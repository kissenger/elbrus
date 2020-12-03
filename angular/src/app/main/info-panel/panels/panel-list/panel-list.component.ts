
/**
 * Gets list data from the backend, and listens for user click on the displayed list
 * Emits the desired changes to the displayed map (listener is routes-list component)
 */

import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { HttpService } from 'src/app/shared/services/http.service';
import * as globals from 'src/app/shared/globals';
import { DataService } from 'src/app/shared/services/data.service';
import { Subscription } from 'rxjs';
import { TsUnits, TsBoundingBox, TsCoordinate, TsListItem } from 'src/app/shared/interfaces';
import { AuthService} from 'src/app/shared/services/auth.service';
import { AlertService } from 'src/app/shared/services/alert.service';
import { Router } from '@angular/router';
import { SpinnerService } from 'src/app/shared/services/spinner.service';
import { ListItems } from 'src/app/shared/classes/list-items';
import { controllers } from 'chart.js';

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

  // @Input() callingPage: TsCallingPageType;
  // @Input() callingTab: 'Routes' | 'Overlays';
  @Input() tabName: 'routes' | 'overlay';

  private listListener: Subscription;
  private mapUpdateListener: Subscription;
  private newUnitsListener: Subscription;
  private newPathListener: Subscription;

  public isLoading = false;

  // keep track of the routes user has selected
  public nSelectedRoutes = 0;


  // class containing methods for manipulation of lists
  public listItems: ListItems = new ListItems();


  // define the colours to highlight overlays
  private highlightColours = {
    colours: [...globals.lineColours],
    opacity: '5A',
    reset() {
      this.colours = [...globals.lineColours];
    }
  };

  // private highlightOpacity = '5A';  // 1E=30%, 32=50%, 4B=75%, 55=85%, 5A=90%

  // keep track of the number of routes available compared to the number loades
  public nAvailableRoutes: number;
  public nLoadedRoutes: number;
  private limit: number;
  private offset = 0;
  public isAllRoutesLoaded = false;
  public isPublicOrPrivate = PUBLIC;   // state of the dropdown box
  private boundingBox: TsBoundingBox = null;    // current view

  // listItems is an array of data to display each list item form the backend
  // activelistItems is an object with key = pathId and value = color of route on map
  // public activelistItems: {[id: string]: string} = {};


  public idFromData: string;

  // keep track of user and preferences
  public isRegisteredUser = this.auth.isRegisteredUser();
  public units: TsUnits;
  public home: TsCoordinate;

  constructor(
    private http: HttpService,
    private data: DataService,
    private auth: AuthService,
    private alert: AlertService,
    private router: Router
  ) {}

  ngOnInit() {

    // determine the number of list items we can fit in the current view height
    this.limit = Math.max(1, Math.floor(((window.innerHeight - LIST_HEIGHT_CORRECTION) / LIST_ITEM_HEIGHT)));

    // check url for pathId - if supplied we'll show that path
    const pathId = this.router.url.split('/').slice(-1)[0];
    const isPathId = pathId.length > 10;
    // if ( isPathId ) {
    //   this.activelistItems[pathId] = this.highlightColours.shift();
    // }

    // do some set up
    this.units = this.isRegisteredUser ? this.auth.getUser().units : globals.defaultUnits;
    if ( this.isRegisteredUser && !isPathId ) {
      this.isPublicOrPrivate = PRIVATE;
    }

    // subscribe to change in map view
    this.mapUpdateListener = this.data.mapBoundsEmitter.subscribe( (bounds: TsBoundingBox) => {
      this.boundingBox = bounds;
      this.offset = 0;
      // this.listItems.removeInactive();
      this.addPathsToList();
    });

    // in case units are changed while viewing the list
    this.newUnitsListener = this.data.unitsUpdateEmitter.subscribe( () => {
      this.units = this.isRegisteredUser ? this.auth.getUser().units : globals.defaultUnits;
    });

    // if overlay mode, listen for a change in active route, and reset
    if ( this.tabName === 'overlay' ) {
      this.newPathListener = this.data.pathIdEmitter.subscribe( () => {
        this.listItems.clear();
        this.highlightColours.reset();
        this.addPathsToList();
      });
    }

  }



  addPathsToList() {

    // stop listening to previous requests if they are still active
    // TODO: send a cencellation request to to the backend process
    if (this.listListener) {
      this.listListener.unsubscribe();
    }

      // dont do anything if in overlay mode and there is no active path selected
      if ( this.tabName === 'overlay' && !this.data.get('activePath', false)) {
        // do nothing

      } else {

        this.isLoading = true;

      this.listListener = this.http.getPathsList('route', this.isPublicOrPrivate, this.offset, this.limit, this.boundingBox)

        .subscribe( ( result: {list: Array<TsListItem>, count: number} ) => {

          this.listItems.removeInactive();
          this.listItems.merge(result.list);

          // work out the numbers
          this.nAvailableRoutes = result.count;
          this.nLoadedRoutes = this.listItems.length;
          this.isAllRoutesLoaded = this.nLoadedRoutes === this.nAvailableRoutes;


          // manage the listener
          this.listListener = undefined;
          this.isLoading = false;

      }, (error) => {
        this.isLoading = false;
        console.log(error);
        this.alert.showAsElement(`${error.name}: ${error.name} `, error.message, true, false).subscribe( () => {});
      });
    }
  }


  onMoreClick() {
    this.offset++;
    this.addPathsToList();
  }


  onSelectMenuChange() {
    this.offset = 0;
    this.listItems.removeInactive();
    this.addPathsToList();
  }


  async onListClick(idFromClick: string) {

    const command = {command: '', id: idFromClick, emit: false, colour: null };

    if ( this.tabName === 'routes' ) {
      // reclicking an active item in routes anything displayed on map and replaces with clicked route
      command.command = 'replace';
      command.emit = true;
      this.listItems.setAllInactive();
      this.highlightColours.reset();

    } else {

      if ( this.listItems.isActive(idFromClick) ) {
        // reclicking an active item in overlay mode clears only that path
        command.command = 'rem';
        const colour = this.listItems.setInactive(idFromClick);
        this.highlightColours.colours.unshift( colour );

      } else {
          // clicking a new item in overlay mode just adds new overlay to map
          command.command = 'add';
          command.colour = this.highlightColours.colours.shift();
          this.listItems.setActive(idFromClick, command.colour);
      }
    }

    // emit command to map
    this.data.pathCommandEmitter.emit(command);

  }


  /** Set syles for list items based on position in list, and whether route is selected. */
  getCssStyle(id: string, i: number, name?: string) {

    const styles = {};


    if ( name === 'highlight' ) {
      // if listItem is active ... dont use listItem class as thats not actually wahts displayed and it gives console errors
      if ( this.listItems.isActive(id) ) {
        if ( this.tabName === 'overlay' ) {
          styles['border-left'] = `7px ${this.listItems.getItemById(id).colour + this.highlightColours.opacity} solid`;
        } else {
          styles['border-left'] = `7px var(--ts-green) solid`;
        }
      } else {
        styles['border-left'] = '7px transparent solid';
      }
    } else {
      styles['border-left'] = '1px #DEE2E6 solid';
      styles['border-right'] = '1px #DEE2E6 solid';
      styles['border-bottom'] = '1px #DEE2E6 solid';
      if ( i === 0 ) {
        styles['border-top'] = '1px #DEE2E6 solid';
      }

      // if overlay, disable the listitem that is stored in data (selected in routes)
      if ( this.tabName === 'overlay' ) {
        if ( this.data.get('activePath', false).properties.pathId === id) {
          styles['color'] = 'lightgrey';
          styles['cursor'] = 'auto';
          styles['pointer-events'] = 'none';
        }
      }

    }

    return styles;

  }




  /**
   * Actions to do when component is destroyed
   */
  ngOnDestroy() {
    if (this.listListener) { this.listListener.unsubscribe(); }
    if (this.mapUpdateListener) { this.mapUpdateListener.unsubscribe(); }
    if (this.newUnitsListener) { this.newUnitsListener.unsubscribe(); }
    if (this.newPathListener) { this.newPathListener.unsubscribe(); }
  }


}

