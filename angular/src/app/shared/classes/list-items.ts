import { TsListItem } from 'src/app/shared/interfaces';



export class ListItems {

  private _listItems: Array<TsListItem>;

  constructor() {
    this._listItems = [];
  }

  public clear() {
    this._listItems = [];
  }

  // merges new items into array, skipping any duplicates
  merge(newListItems: Array<TsListItem>) {
    const filteredNewList = newListItems.filter( (item) => this._listItems.map( e => e.pathId ).indexOf(item.pathId) === -1 );
    this._listItems = this._listItems.concat(filteredNewList);
  }

  removeInactive() {
    this._listItems = this._listItems.filter( item => item.isActive === true );
  }

  deleteItemById(pathId: string) {
    this._listItems.splice( this._listItems.findIndex(item => item.pathId === pathId), 1 );
  }

  get length() {
    return this._listItems.length;
  }

  setInactive(pathId: string) {
    const indx = this._listItems.findIndex(item => item.pathId === pathId);
    const colour = this._listItems[indx].colour;
    this._listItems[indx].isActive = false;
    this._listItems[indx].colour = null;
    return colour;
  }

  setActive(pathId: string, colour: string) {
    const indx = this._listItems.findIndex(item => item.pathId === pathId);
    this._listItems[indx].isActive = true;
    this._listItems[indx].colour = colour;
  }

  getItemById(pathId: string): TsListItem {
    return this._listItems.find(item => item.pathId === pathId);
  }

  isActive(pathId: string) {
    console.log(this._listItems.find(item => item.pathId === pathId).isActive);
    console.log(this._listItems.find(item => item.pathId === pathId));
    return !!this._listItems.find(item => item.pathId === pathId).isActive;
  }

  setAllInactive() {
    this._listItems.forEach( item => {
      item.isActive = false;
      item.colour = null;
    });
  }

  get array() {
    return this._listItems;
  }



}
