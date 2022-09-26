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

  get length() {
    return this._listItems.length;
  }

  unselect(pathId: string) {
    const indx = this._listItems.findIndex(item => item.pathId === pathId);
    const colour = this._listItems[indx].colour;
    this._listItems[indx].isActive = false;
    this._listItems[indx].colour = null;

    return colour;
  }

 select(pathId: string, colour: string) {
    const indx = this._listItems.findIndex(item => item.pathId === pathId);
    this._listItems[indx].isActive = true;
    this._listItems[indx].colour = colour;
  }

  unselectAll() {
    this._listItems.forEach( item => {
      item.isActive = false;
      item.colour = null;
    });
  }

  removeInactive() {
    this._listItems = this._listItems.filter( item => item.isActive === true );
  }

  getItemById(pathId: string): TsListItem {
    return this._listItems.find(item => item.pathId === pathId);
  }

  isSelected(pathId: string) {
    return !!this._listItems.find(item => item.pathId === pathId).isActive;
  }

  get array() {
    return this._listItems;
  }

}
