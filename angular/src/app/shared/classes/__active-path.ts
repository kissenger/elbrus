
import { TsFeatureCollection, TsFeature, TsPosition, TsPoint, TsCoordinate } from 'src/app/shared/interfaces';
import { emptyGeoJson } from '../globals';

export class ActivePath {

  private _activePath: TsFeatureCollection;
  private _firstPoint: TsCoordinate;

  constructor() {
    this._activePath = emptyGeoJson;
  }

  // clear() {
  //   this._activePath.features = [];
  // }

  // set path(path: TsFeatureCollection) {
  //   this._activePath = path;
  // }

  // get path() {
  //   return this._activePath;
  // }

  // getFeature(featureIndex) {
  //   return this._activePath.features[featureIndex];
  // }

  // get numberOfFeatures() {
  //   return this._activePath.features.length;
  // }

  // /**
  //  * Returns a points geoJson of all the coordinates in the activePath - duplicate points
  //  * removed.
  //  * If the activePath is empty and _firstPoint is set, return that.
  //  */
  // get activePoints() {


  //   if (this._activePath.features.length === 0)  {
  //     if (this._firstPoint ) {
  //       return getFeatureCollection([getPointFeature([this._firstPoint.lng, this._firstPoint.lat], '0', 'start')]);
  //     } else {
  //       return <TsFeatureCollection>{type: 'FeatureCollection', features: [] };
  //     }

  //   }

  //   const coordsArray = [];

  //   // get list of coordinates from all features
  //   this._activePath.features.forEach( (feature, fi) => {
  //     feature.geometry.coordinates.forEach( (coord, ci) => {
  //       if (fi !== 0 && ci === 0 ) {
  //         // prevents duplicating first point
  //       } else {
  //         coordsArray.push(coord);
  //       }
  //     });
  //   });

  //   // create features
  //   const pointFeatures = coordsArray.map( (coord, index) => {
  //     const text = index === 0 ? 'start' : index === coordsArray.length - 1 ? 'end' : null;
  //     return getPointFeature(coord, `${index}`, text);
  //   });

  //   return getFeatureCollection(pointFeatures);

  // }


  updatePoint(featureIndex: number, coordIndex: number, newCoords: TsPosition) {
    this._activePath.features[featureIndex].geometry.coordinates[coordIndex] = newCoords;
  }


  set firstPoint(point: TsCoordinate) {
    this._firstPoint = point;
  }

  clearFirstPoint() {
    this._firstPoint = null;
  }
  /**
   * Finds the feature and coordinate indices for a given coordinate pair
   */
  // findFeature(pointCoord: TsPosition) {

  //   const nFeatures = this.numberOfFeatures;
  //   const stringyCoord = JSON.stringify(pointCoord);

  //   // for loops chosen as need access to indexes, and need to be able to jump out of loop
  //   for (let fi = 0; fi < nFeatures; fi++) {
  //     const nCoords = this._activePath.features[fi].geometry.coordinates.length;
  //     for (let ci = 0; ci < nCoords; ci++) {
  //       if (JSON.stringify(this._activePath.features[fi].geometry.coordinates[ci]) === stringyCoord) {
  //         const result = [{featureIndex: fi, coordIndex: ci}];
  //         if (fi !== nFeatures - 1 && ci === nCoords - 1) {
  //           result.push({featureIndex: fi + 1, coordIndex: 0});
  //         }
  //         return result;
  //       }
  //     }
  //   }

  // }



}



// function getFeatureCollection(features: Array<TsFeature>) {

//   return <TsFeatureCollection>{
//     type: 'FeatureCollection',
//     features: features
//   };
// }

// function getPointFeature(point: TsPosition, pointId: string, text?: string) {

//   const feature =  <TsFeature> {
//     type: 'Feature',
//     id: pointId,
//     geometry: <TsPoint>{
//       type: 'Point',
//       coordinates: point
//     }
//   };

//   if (text) {
//     feature.properties = {
//       title: text
//     };
//   }

//   return feature;
// }
