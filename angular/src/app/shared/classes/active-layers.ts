import { TsBoundingBox } from './../interfaces';



export class ActiveLayers {

  private _layers: Array<{pathId: string, bbox: TsBoundingBox}>;

  constructor() {
    this._layers = [];
  }

  public add(pathId: string, bbox: TsBoundingBox) {
    this._layers.push({pathId, bbox});
    console.log(this._layers);
  }

  public clear() {
    this._layers = [];
    return [];
  }

  public remove(pathId: string) {
    return this._layers.filter( layer => layer.pathId !== pathId );
  }

  public get length() {
    return this._layers.length;
  }

  public get outerBoundingBox(): TsBoundingBox {
    return this._layers.reduce( (arr, layer) => [
      Math.min(arr[0], layer.bbox[0]),
      Math.min(arr[1], layer.bbox[1]),
      Math.max(arr[2], layer.bbox[2]),
      Math.max(arr[3], layer.bbox[3]) ],
      [180, 90, -180, -90] );
  //   return this._layers.reduce( (arr, layer) =>
  //     box,
  //     [180, 90, -180, -90] );
  }



  public get get() {
    return this._layers;
  }

}
