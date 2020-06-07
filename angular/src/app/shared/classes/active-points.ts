
import { TsFeatureCollection, TsPosition, TsCoordinate } from 'src/app/shared/interfaces';

export class ActivePoints {

  private _activePoints: TsFeatureCollection;

  constructor() {
    this._activePoints = {type: 'FeatureCollection', features: [] };
  }

  set points(path: TsFeatureCollection) {
    this._activePoints = path;
  }

  get points() {
    return this._activePoints;
  }

  get length() {
    return this._activePoints.features.length;
  }

  get coords() {
    return <Array<TsCoordinate>>this._activePoints.features.map( c => ({lng: c.geometry.coordinates[0], lat: c.geometry.coordinates[1]}) );
  }


  updatePoint(pointIndex: number, newCoords: TsPosition ) {
    this._activePoints.features[pointIndex].geometry.coordinates = newCoords;
    // return this._activePoints.features.find( feature => parseInt(feature.id, 10) === pointId );

  }

  // returns coordinates for a given point index (id) as a TsPosition
  coordsAtIndex(pointIndex: number) {
    return <TsPosition>this._activePoints.features[pointIndex].geometry.coordinates;
  }

}
