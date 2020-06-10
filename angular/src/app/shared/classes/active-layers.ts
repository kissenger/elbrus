


export class ActiveLayers {

  private _layers: Array<string>;

  constructor() {
    this._layers = [];
  }

  public add(pathId: string) {
    this._layers.push(pathId);
  }

  public clear() {
    this._layers = [];
  }

  public remove(pathId: string) {
    return this._layers.filter( pid => pid !== pathId );
  }

  public get get() {
    return this._layers;
  }

}
