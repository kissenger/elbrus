
/**
 * Gets list data from the backend, and listens for user click on the displayed list
 * Emits the desired changes to the displayed map (listener is routes-list component)
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpService } from 'src/app/shared/services/http.service';
import * as globals from 'src/app/shared/globals';
import { DataService } from 'src/app/shared/services/data.service';
import { Subscription } from 'rxjs';
import { TsUnits, TsListArray, TsBoundingBox, TsCoordinate } from 'src/app/shared/interfaces';
import { AuthService} from 'src/app/shared/services/auth.service';
import { AlertService } from 'src/app/shared/services/alert.service';
import { Router } from '@angular/router';
import { SpinnerService } from 'src/app/shared/services/spinner.service';

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

  private getListListener: Subscription;
  private mapUpdateListener: Subscription;
  private newDataListener: Subscription;
  private newPathListener: Subscription;

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
    this.mapUpdateListener = this.data.mapBoundsEmitter.subscribe( (bounds: TsBoundingBox) => {
      this.boundingBox = bounds;
      this.offset = 0;
      const selectedPaths = this.listItems.filter(listItem => listItem.pathId in this.selectedPaths);
      this.addPathsToList(selectedPaths);
    });

    // in case units are changed while viewing the list
    this.newDataListener = this.data.unitsUpdateEmitter.subscribe( () => {
      this.units = this.isRegisteredUser ? this.auth.getUser().units : globals.defaultUnits;
    });

  }



  addPathsToList(protectedPaths: TsListArray = null) {

      this.spinner.showAsElement();

      this.getListListener = this.http.getPathsList('route', this.isPublicOrPrivate, this.offset, this.nRoutesToLoad, this.boundingBox)
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


  async onListClick(idFromClick: string) {

    if ( idFromClick in this.selectedPaths) {

      if ( this.selectedPaths[idFromClick] === null ) {

        // reclicked on first route, clear it and all overlays


        // make changes to map
        await this.updateMap({
          command: 'clear'
        }) ;

        this.highlightColours = [null, ...globals.lineColours];
        this.selectedPaths = {};
        this.nSelectedRoutes = 0;

      } else {

        // reclicked an overlay, just clear the overlay


        // make changes to map
        await this.updateMap({
          command: 'rem',
          id: idFromClick
        });

        this.highlightColours.unshift(this.selectedPaths[idFromClick]);
        delete this.selectedPaths[idFromClick];
        this.nSelectedRoutes = Object.keys(this.selectedPaths).length;

      }

    } else {

      // new route so add it - only emit pathId from map-service if its the first path selected
      // note things are not done in quite the nicest way in order to get the right behaviour (ie list only updates after confirmation)
      const command = {
        command: 'add',
        id: idFromClick,
        colour: this.highlightColours.shift(),
        emit: Object.keys(this.selectedPaths).length + 1 === 1
      };

      await this.updateMap(command);

      // bump selected item to the top of the list
      this.selectedPaths[idFromClick] = command.colour;
      this.nSelectedRoutes = Object.keys(this.selectedPaths).length;
      if ( this.nSelectedRoutes === 1 ) {
        const indx = this.listItems.findIndex( i => i.pathId === idFromClick);
        this.listItems.splice(this.nSelectedRoutes - 1, 0, this.listItems.splice(indx, 1)[0]);
      }

    }
  }


  updateMap(emitOptions: {command?: string, id?: string, colour?: string, emit?: boolean}) {

    return new Promise( (resolve, reject) => {

      // listen for path emitter to indicate data has loaded
      this.newPathListener = this.data.pathIdEmitter.subscribe( (path: {action: string, pid: string} ) => {
          this.newPathListener.unsubscribe();
          console.log('map update finished');
          resolve();
      });

      // request map update
      this.data.pathCommandEmitter.emit(emitOptions);

    });
  }


  /** Set syles for list items based on position in list, and whether route is selected. */
  getCssStyle(id: string, i: number) {

    const styles = {};

    styles['border-left'] = '1px #DEE2E6 solid';
    styles['border-right'] = '1px #DEE2E6 solid';
    styles['border-bottom'] = '1px #DEE2E6 solid';
    styles['padding-left'] = '7px';



    if ( this.nSelectedRoutes === 0 ) {
      // styles['background'] = i % 2 === 0 ? '#fdfdfd' : 'whitesmoke';
      if ( i === 0 ) {
        styles['border-top'] = '1px #DEE2E6 solid';
      } else if ( i === this.nLoadedRoutes - 1) {
        styles['border-bottom'] = '1px #DEE2E6 solid';
      }
    } else {
      // styles['background'] = i % 2 === 0 ? 'whitesmoke' : '#fdfdfd';
      if ( i <= 1 ) {
        styles['border-top'] = '1px #DEE2E6 solid';
      } else if ( i === this.nLoadedRoutes - 1) {
        styles['border-bottom'] = '1px #DEE2E6 solid';
      }
    }

    if ( i !== 0 && id in this.selectedPaths) {
      styles['padding-left'] = '1px';
      styles['border-left'] = `7px ${this.selectedPaths[id] + this.highlightOpacity} solid`;
    }


//     styles['border-bottom'] = i > 0 && i < this.nSelectedRoutes ? '1px #DEE2E6 solid' : '2px #DEE2E6 solid';
//     styles['border-top'] = i === 0 ? '1px #DEE2E6 solid' : 'none';



//     styles['background-color'] = i % 2 === 0 ? '' : 'whitesmoke';
// // console.log(this.nSelectedRoutes)
//     if ( this.nSelectedRoutes > 0 ) {

//       if ( i % 2 === 0 ) {

//         // styles['background-color'] = 'whitesmoke';
//       } else if ( i === 1 ) {
//         styles['border-top'] = '1px #DEE2E6 solid';
//       }

//       if ( i !== 0 && id in this.selectedPaths) {
//         styles['background-color'] = this.selectedPaths[id] + this.highlightOpacity;
//       }
//     }


    // if ( this.nSelectedRoutes > 0 ) {
    //   styles['border-top'] = i === 1 ? '1px #DEE2E6 solid' : 'none';
    //   styles['background-color'] = i === 0 ? 'whitesmoke' : 'none';

    // }



    return styles;

  }




  /**
   * Actions to do when component is destroyed
   */
  ngOnDestroy() {
    if (this.getListListener) { this.getListListener.unsubscribe(); }
    if (this.mapUpdateListener) { this.mapUpdateListener.unsubscribe(); }
    if (this.newDataListener) { this.newDataListener.unsubscribe(); }
  }


}

