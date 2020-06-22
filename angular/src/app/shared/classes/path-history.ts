
  import { TsCoordinate, TsFeatureCollection, TsFeature, TsPosition, TsPoint } from 'src/app/shared/interfaces';
  import { emptyGeoJson } from '../globals';
  import { Path } from './path-class';
  import { GeoJsonPipe } from '../geojson.pipe';
  import { Injector } from '@angular/core';

  export class PathHistory {

    private history: Array<Path>;
    private newGeoJson: TsFeatureCollection;
    private _firstPoint: TsCoordinate = null;
    private isNewRoute: boolean;
    private pathName: string;
    private pathDescription: string;
    private pathId: string;
    private UNDO_LENGTH = 30;
    private geoJsonPipe: GeoJsonPipe;


    constructor(path?: Path) {

      // injects the services into the instance
      const injector = Injector.create({ providers: [ { provide: GeoJsonPipe, deps: [] } ] });
      this.geoJsonPipe = Object.getPrototypeOf(injector.get(GeoJsonPipe));

       // Warning - need to make a deep clone of the emptyGeoJson object
      this.newGeoJson = JSON.parse(JSON.stringify(emptyGeoJson));

      if (path) {
        this.history = [path];
        this.isNewRoute = false;
        // this.pathName = existingGeoJson.properties.info.name;
        // this.pathDescription = existingGeoJson.properties.info.description;
        // this.pathId = existingGeoJson.properties.pathId;
      } else {
        this.history = [];
        this.isNewRoute = true;
        this.pathId = '0000';
      }

    }


    set firstPoint(point: TsCoordinate) {
      this._firstPoint = point;
    }


    get firstPoint() {
      return this._firstPoint ? this._firstPoint : null;
    }


    get lastPoint() {
      if ( this.lastPath ) {
        return this.lastPath.lastPoint;
      } else {
        return this._firstPoint;
      }
    }



    add(path: Path) {

      if ( this.length === this.UNDO_LENGTH ) {
        this.history.splice(0, 1);
      }

      this.history.push(path);

    }



    undo() {
      // remove the most recent item in the history and return true is something was removed, false if no more to undo

      if ( this.isNewRoute ) {

        if ( this.length === 1 ) {
          this._firstPoint = null;
          return true;
        } else if ( this.length > 1) {
          this.history.pop();
          return true;
        }

      } else {

        if ( this.length > 1 ) {
          this.history.pop();
          return true;
        }

      }

      return false;

    }


    get length() {
      return this.history.length;
    }


    undoAll() {

      this.history = [];
      this._firstPoint = null;

    }


    get lastPath() {

      if ( this.length === 0 ) {
        return null;
      } else {
        return this.history[this.length - 1];
      }

    }


    get coords() {

      if ( this.lastPath ) {
        return this.lastPath.coords;
      } else {
        return [this._firstPoint];
      }

    }

    coordsAtIndex(pointIndex: number): TsPosition {
      if ( this.lastPath) {
        return this.lastPath.positions[pointIndex];
      } else if (this.firstPoint) {
        return [this.firstPoint.lng, this.firstPoint.lat];
      }
    }


    get activePoints() {
      // return active points on the last active path. If there isnt one, return firstpoint or null

      if (this.lastPath) {
        return this.lastPath.pointsGeoJson;
      } else if (this.firstPoint) {
        return this.geoJsonPipe.transform([[this.firstPoint.lng, this.firstPoint.lat]], 'Point');
      } else {
        return this.geoJsonPipe.transform([], 'Point');
      }

    }


    get boundingBox() {
      if ( this.lastPath ) {
        return this.lastPath.boundingBox;
      }
    }

    get startEndPoints() {
      if ( this.lastPath ) {
        return this.lastPath.startEndPoints;
      } else if ( this.firstPoint ) {
        return this.geoJsonPipe.transform([[this.firstPoint.lng, this.firstPoint.lat]], 'Point', ['start']);
      } else {
        return this.geoJsonPipe.transform([], 'Point');
      }
    }

    get simpleGeo() {

      if ( this.lastPath ) {
        return this.lastPath.simplifiedGeoJson;
      } else {
        return this.geoJsonPipe.transform([], 'LineString');
      }

    }


    get fullGeo() {

      if ( this.lastPath ) {
        return this.lastPath.geoJson;
      } else {
        return this.geoJsonPipe.transform([], 'LineString');
      }

    }


    get nPoints() {
      return this.lastPath.coords.length;
    }


    matchFeature(pointCoord: TsPosition) {
      return this.lastPath.matchFeature(pointCoord);
    }




  }







      // get firstPoint(): TsCoordinate {
    //     return this._firstPoint;

    // }


    // get lastPoint(): TsCoordinate {
    //   // return the last point in the last geojson if it exists - if not return firstpoint
    //   if ( !this.activePathCoords[this.activePathCoords.length - 1] ) {
    //     return this.firstPoint;
    //   } else {
    //     return this.activePathCoords[this.activePathCoords.length - 1];
    //   }
    // }


//     /**
//      *
//      * Methods acting on the last entry in the history (the 'active path')
//      */

//     get activePath() {
//       const activePath = this.history[this.history.length - 1];
//       activePath.properties.info.name = this.pathName;
//       activePath.properties.info.description = this.pathDescription;
//       activePath.properties.pathId = this.pathId;
//       return  activePath;
//     }


//     get activePathClone() {
//       // return the last GeoJson in the history
//       // important to clone the object to avoid route edits affecting the undo history
//       const activePath = {type: 'FeatureCollection', features: this.history[this.history.length - 1].features};
//       return  JSON.parse(JSON.stringify( activePath ));
//     }


//     get activePathCoords(): Array<TsCoordinate> {
//       // return only the coordinates from the last geoJson, note there could be multiple features so concat first
//       // NOTE this returns duplicate points where lines meet (last point of feature n and first point of feature n+1)

//       const coords = this.activePath.features.reduce( (a, b) => a.concat(b.geometry.coordinates), []);
//       return coords.map(c => ({lng: c[0], lat: c[1]}));

//     }


//     get activePathFeaturesLength() {
//       return this.activePath.features.length;
//     }


//     activePathFeature(featureIndex) {
//       // returns the desired feature on the active path
//       return this.activePath.features[featureIndex];
//     }


//     // updatePoint(featureIndex: number, coordIndex: number, newCoords: TsPosition) {
//     //   // returns activepath geojson with the requested point updated

//     //   this.activePath.features[featureIndex].geometry.coordinates[coordIndex] = newCoords;
//     // }


//     /**
//      * Returns the feature and coordinate indices of a given coordinate as a TsPosition
//      */
//     activePathMatchFeature(pointCoord: TsPosition) {

//       const nFeatures = this.activePathFeaturesLength;
//       const stringyCoord = JSON.stringify(pointCoord);

//       // for loops chosen as need access to indexes, and need to be able to jump out of loop
//       for (let fi = 0; fi < nFeatures; fi++) {
//         const nCoords = this.activePath.features[fi].geometry.coordinates.length;
//         for (let ci = 0; ci < nCoords; ci++) {
//           if (JSON.stringify(this.activePath.features[fi].geometry.coordinates[ci]) === stringyCoord) {
//             const result = [{featureIndex: fi, coordIndex: ci}];
//             if (fi !== nFeatures - 1 && ci === nCoords - 1) {
//               result.push({featureIndex: fi + 1, coordIndex: 0});
//             }
//             return result;
//           }
//         }
//       }

//     }


//   /**
//    * Returns a points geoJson of all the coordinates in the activePath - duplicate points
//    * removed.
//    * If the activePath is empty and _firstPoint is set, return that.
//    */
//   get activePoints() {

//     if ( this.activePath.features[0].geometry.coordinates.length === 0 ) {
//       if ( this.firstPoint ) {
//         return getFeatureCollection([getPointFeature([this.firstPoint.lng, this.firstPoint.lat], '0', 'start')]);
//       } else {
//         return getFeatureCollection([getPointFeature([])]);
//       }
//     }

//     const coordsArray = [];

//     // get list of coordinates from all features
//     this.activePath.features.forEach( (feature, fi) => {
//       feature.geometry.coordinates.forEach( (coord, ci) => {
//         if (fi !== 0 && ci === 0 ) {
//           // prevents duplicating first point
//         } else {
//           coordsArray.push(coord);
//         }
//       });
//     });

//     // create features
//     const pointFeatures = coordsArray.map( (coord, index) => {
//       const text = index === 0 ? 'start' : index === coordsArray.length - 1 ? 'end' : null;
//       return getPointFeature(coord, `${index}`, text);
//     });

//     return getFeatureCollection(pointFeatures);

//     }
//   }


// function getFeatureCollection(features: Array<TsFeature>) {

//   return <TsFeatureCollection>{
//     type: 'FeatureCollection',
//     features: features
//   };
// }



// function getPointFeature(point: TsPosition | [], pointId?: string, text?: string) {

//   // if (!point) {
//   //   return {type: 'Feature', geometry: {type: 'Point', coordinates}}
//   // }

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
