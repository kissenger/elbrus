import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { HttpService } from 'src/app/shared/services/http.service';
import * as globals from 'src/app/shared/globals';
import { DataService } from 'src/app/shared/services/data.service';
import { Subscription } from 'rxjs';
import { TsUnits, TsListArray } from 'src/app/shared/interfaces';
import { MapCreateService } from 'src/app/shared/services/map-create.service';
import { AuthService} from 'src/app/shared/services/auth.service';

@Component({
  selector: 'app-panel-list',
  templateUrl: './panel-list.component.html',
  styleUrls: ['./panel-list.component.css']
})
export class PanelRoutesListListComponent implements OnInit, OnDestroy {

  @Input() callingPage: string;

  private getPathsSubscription: Subscription;
  private mapUpdateSubscription: Subscription;
  private listOffset = 0;
  private boundingBox: Array<number> = [];
  private activePathsArray: Array<string> = [];
  private limit = 9;  // number of paths to display in one go - more can be pulled if needed

  public listData: TsListArray = [];
  public pathId: string;
  public isEndOfList = false; // value is read in the html do dont be tempted to delete
  public units: TsUnits = this.auth.getUser().units;
  public numberOfRoutes: number;
  public numberOfLoadedRoutes: number;

  constructor(
    private httpService: HttpService,
    private dataService: DataService,
    private mapCreateService: MapCreateService,
    private auth: AuthService
  ) {}

  ngOnInit() {

    if (this.callingPage === 'create') {
      // if create page then we need to know the current view on map so we can get appropriate overlay paths
      if (this.mapCreateService.isMap()) {
        this.boundingBox = this.mapCreateService.getMapBounds();
        this.updateList(false);

        // update the list when the view is moved
        this.mapUpdateSubscription = this.dataService.mapBoundsEmitter.subscribe( (bb: Array<number>) => {
          this.boundingBox = bb;
          this.updateList(false);
        });
      }

    } else {
      this.updateList(true);
    }

    this.dataService.unitsUpdateEmitter.subscribe( () => {
      this.units = this.auth.getUser().units;
    });
  }


  /**
  * Get list data on component load or request for additional list items
  * @param booEmitFirstPathId true on first pass, false otherwise - to prevent path change when 'more' is pressed
  */
  updateList(booAutoSelectPathId: boolean) {

    this.getPathsSubscription = this.httpService.getPathsList('route', this.listOffset, this.limit, this.boundingBox)
      .subscribe( pathsList => {

      if (this.callingPage === 'create') {
        // this approach is limiting - dont know what will happen when more than 9 paths are returned
        // filter out all list items that are not active on the map
        const a = this.listData.filter(el => this.activePathsArray.includes(el.pathId));
        // filter out any items in paths list that are in the filtered list array
        const b = pathsList.filter(bel => !a.find(ael => bel.pathId === ael.pathId));
        this.listData = [...a, ...b];
      } else {
        this.listData = this.listData.concat(pathsList);
      }
      this.numberOfRoutes = pathsList.length === 0 ? 0 : this.listData[0].count;
      this.numberOfLoadedRoutes = this.listData.length;
      this.isEndOfList = this.numberOfLoadedRoutes === this.numberOfRoutes;

      // emit the first id in the list and highlight that row
      if (booAutoSelectPathId) {
        this.pathId = this.listData.length === 0 ? '0' : this.listData[0].pathId;
        this.dataService.pathIdEmitter.emit(this.pathId);
      }
    });




  }


  /**
  * Request additional items in list
  */
  onMoreClick() {
    this.listOffset++;
    this.updateList(false);
  }


  /**
   * Resets list item highlight and requests new map display
   * @param idFromClick id of path requested
   */
  onLineClick(idFromClick: string) {

    this.dataService.pathIdEmitter.emit(idFromClick);

    // for overlaid paths, toggle highlighting on row
    if (this.callingPage === 'create') {

      if (this.activePathsArray.includes(idFromClick)) {
        this.activePathsArray.splice(this.activePathsArray.indexOf(idFromClick), 1);
      } else {
        this.activePathsArray.push(idFromClick);
      }

      // for basic list, do nothing if row if clicked again
    } else {
      if (idFromClick !== this.pathId) {
        this.pathId = idFromClick;
      }
    }
  }




  /**
   * function used in html template - returns the css classes according to some conditions
   * @param id id of the list item being processed
   * @param i index of the list item being processed
   */
  getCssClass(id: string, i: number) {
    let cssClass = '';
    if (this.callingPage === 'create') {
      if (this.activePathsArray.includes(id)) {
        cssClass += 'highlight-div ';
      }
    } else {
      if (id === this.pathId) {
        cssClass += 'highlight-div ';
      }
    }
    if (i === 0) {
      cssClass += 'border-top mt-1';
    }
    return cssClass;
  }




  /**
   * Actions to do when component is destroyed
   */
  ngOnDestroy() {
    if (this.getPathsSubscription) { this.getPathsSubscription.unsubscribe(); }
    if (this.mapUpdateSubscription) { this.mapUpdateSubscription.unsubscribe(); }
  }


}

