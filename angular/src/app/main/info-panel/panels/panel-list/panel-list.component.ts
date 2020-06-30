/**
 * Gets list data from the backend, and listens for user click on the displayed list
 * Emits the desired changes to the displayed map (listener is routes-list component)
 */

import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { HttpService } from 'src/app/shared/services/http.service';
import { DataService } from 'src/app/shared/services/data.service';
import { Subscription } from 'rxjs';
import { TsUnits, TsListArray, TsBoundingBox, TsCoordinate } from 'src/app/shared/interfaces';
import { MapCreateService } from 'src/app/shared/services/map-create.service';
import { AuthService} from 'src/app/shared/services/auth.service';
import { MapService } from 'src/app/shared/services/map.service';
import { AlertService } from 'src/app/shared/services/alert.service';

@Component({
  selector: 'app-panel-list',
  templateUrl: './panel-list.component.html',
  styleUrls: ['./panel-list.component.css']
})
export class PanelListComponent implements OnInit, OnDestroy {

  @Input() callingPage: string;

  private getListSubscription: Subscription;
  private mapUpdateSubscription: Subscription;
  private dataServiceSubscription: Subscription;

  private offset = 0;               // describes the chunk of the list to request
  private limit = 9;                    // number of paths to request at one time
  public numberOfRoutes: number;
  public numberOfLoadedRoutes: number;
  public isEndOfList = false;

  public homeLocation: TsCoordinate = this.auth.getUser().homeLngLat;
  private boundingBox: TsBoundingBox = null;
  public activePaths = {};
  private colourPallet = [
    '#FF0000', '#FF8000', '#FFFF00', '#80FF00', '#00FF00', '#00FF80', '#00FFFF', '#0080FF', '#0000FF', '#8000FF', '#FF00FF', '#FF0080'
  ];
  private highlightColours = [null, ...this.colourPallet];
  private highlightOpacity = '5A';  // 1E=30%, 32=50%, 4B=75%, 55=85%, 5A=90%

  public listItems: TsListArray = [];
  public publicOrPrivatePaths = 'private';
  public units: TsUnits = this.auth.getUser().units;

  constructor(
    private httpService: HttpService,
    private dataService: DataService,
    private mapCreateService: MapCreateService,
    private mapService: MapService,
    private auth: AuthService,
    private alert: AlertService,
  ) {}

  ngOnInit() {

    this.offset = 0;
    this.addPathsToList();

    // subscribe to change in map view
    this.mapUpdateSubscription = this.dataService.mapBoundsEmitter.subscribe( () => {
      this.offset = 0;
      // this.resetList();
      const selectedPaths = this.listItems.filter(listItem => listItem.pathId in this.activePaths);
      console.log('selectedPaths', selectedPaths);
      this.addPathsToList(selectedPaths);
    });

    // in case units are changed while viewing the list
    this.dataServiceSubscription = this.dataService.unitsUpdateEmitter.subscribe( () => {
      this.units = this.auth.getUser().units;
    });

  }


  // resetList() {
  //   // const selectedListItems = this.listItems.filter(listItem => listItem.pathId in this.activePaths);
  //   this.listItems = this.listItems.filter(item => item.pathId in this.activePaths);
  //   this.listOffset = 0;

  // }

  addPathsToList(protectedPaths: TsListArray = null) {

    try {
      this.boundingBox = <TsBoundingBox>this.mapCreateService.getMapBounds();
    } catch {
      this.boundingBox = <TsBoundingBox>this.mapService.getMapBounds();
    }

    this.getListSubscription = this.httpService
      .getPathsList('route', this.publicOrPrivatePaths === 'public', this.offset, this.limit, this.boundingBox)
      .subscribe( result => {

        const backendList = result.list;
        const count = result.count;

        const temp = protectedPaths ? protectedPaths : this.listItems;
        const fullList = [...temp, ...backendList];

        // filter out duplicates
        const fullListPathIds = fullList.map( item => item.pathId );
        const filteredList = fullList.filter( (item, i) => fullListPathIds.indexOf(item.pathId) === i );
        this.listItems = filteredList;

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



  onListClick(idFromClick: string) {

    let emitCommand: Object;

    if ( idFromClick in this.activePaths ) {

      if ( this.activePaths[idFromClick] === null ) {
        // reclicked on first route, clear it and all overlays
        this.highlightColours = [null, ...this.colourPallet];
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

    this.dataService.pathIdEmitter.emit( emitCommand );

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

