import { TsFeatureCollection, TsCoordinate, TsPosition, TsFeature, TsPoint } from '../interfaces';
import { GeoJsonPipe } from '../geojson.pipe';
import { Injector } from '@angular/core';


export class Path {

  private _geoJson: TsFeatureCollection;
  private geoJsonPipe: GeoJsonPipe;

  constructor( geoJson: TsFeatureCollection ) {

    this._geoJson = geoJson;
    const injector = Injector.create({ providers: [ { provide: GeoJsonPipe, deps: [] } ] });
    this.geoJsonPipe = Object.getPrototypeOf(injector.get(GeoJsonPipe));

  }


  get geoJson() {
    return  this._geoJson;
  }


  get firstPoint(): TsCoordinate {
    const pos = this._geoJson.features[0].geometry.coordinates[0];
    return {lng: pos[0], lat: pos[1] };
  }


  get lastPoint(): TsCoordinate {
    return this.coords[this.coords.length - 1];
  }


  get simplifiedGeoJson() {
    // return the last GeoJson in the history
    // important to clone the object to avoid route edits affecting the undo history
    const activePath = {type: 'FeatureCollection', features: this._geoJson.features};
    return  JSON.parse(JSON.stringify( activePath ));
  }


  get positions(): Array<TsPosition> {

    // get list of coordinates from all features
    const coordsArray = [];
    this._geoJson.features.forEach( (feature, fi) => {
      feature.geometry.coordinates.forEach( (coord, ci) => {
        if (fi !== 0 && ci === 0 ) {
          // prevents duplicating first point
        } else {
          coordsArray.push(coord);
        }
      });
    });

    return coordsArray;

  }


  get coords(): Array<TsCoordinate> {
    return this.positions.map(c => ({lng: c[0], lat: c[1]}));
  }


  get nFeatures() {
    return this._geoJson.features.length;
  }


  getFeature(featureIndex) {
    // returns the desired feature on the active path
    return this._geoJson.features[featureIndex];
  }


  /**
   * Returns the feature and coordinate indices of a given coordinate as a TsPosition
   */
  matchFeature(pointCoord: TsPosition) {

    const stringyCoord = JSON.stringify(pointCoord);

    // for loops chosen as need access to indexes, and need to be able to jump out of loop
    for (let fi = 0; fi < this.nFeatures; fi++) {
      const nCoords = this._geoJson.features[fi].geometry.coordinates.length;
      for (let ci = 0; ci < nCoords; ci++) {
        if (JSON.stringify(this._geoJson.features[fi].geometry.coordinates[ci]) === stringyCoord) {
          const result = [{featureIndex: fi, coordIndex: ci}];
          if (fi !== this.nFeatures - 1 && ci === nCoords - 1) {
            result.push({featureIndex: fi + 1, coordIndex: 0});
          }
          return result;
        }
      }
    }

  }


  /**
   * Returns a points geoJson of all the coordinates in the activePath - duplicate points
   * removed.
   * If the activePath is empty and _firstPoint is set, return that.
   */
  get pointsGeoJson() {

    return this.geoJsonPipe.transform(this.positions, 'Point');

  }

}
