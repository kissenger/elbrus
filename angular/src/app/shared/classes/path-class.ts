import { TsFeatureCollection, TsPosition, TsBoundingBox } from '../interfaces';
import { GeoJsonPipe } from 'src/app/shared/pipes/geojson.pipe';
import { Injector } from '@angular/core';


export class Path {

  private _geoJson: TsFeatureCollection;
  private geoJsonPipe: GeoJsonPipe;
  public positionsList: Array<TsPosition>;
  public firstPoint: TsPosition;
  public lastPoint: TsPosition;
  private nFeatures: number;

  constructor( geoJson: TsFeatureCollection ) {

    this._geoJson = geoJson;
    const injector = Injector.create({ providers: [ { provide: GeoJsonPipe, deps: [] } ] });
    this.geoJsonPipe = Object.getPrototypeOf(injector.get(GeoJsonPipe));
    this.positionsList = this.getPositionsArray;
    this.firstPoint = this.positionsList[0];
    this.lastPoint = this.positionsList[this.positionsList.length - 1];
    this.nFeatures = this._geoJson.features.length;

  }


  get geoJson() {
    return  this._geoJson;
  }


  get boundingBox() {

    const bb = this.positionsList.reduce( (bbox, point) => ({
      minLng: Math.min(point[0], bbox.minLng),
      maxLng: Math.max(point[0], bbox.maxLng),
      minLat: Math.min(point[1], bbox.minLat),
      maxLat: Math.max(point[1], bbox.maxLat)
    }), { minLng: 180, minLat: 90, maxLng: -180, maxLat: -90 });

    return <TsBoundingBox>[bb.minLng, bb.minLat, bb.maxLng, bb.maxLat];
  }



  /**
   * Returns a clone of the geojson features (global properties are dropped)
   * This is needed as this will be displayed on the map, and we need to break the pointer so that map updates dont
   * affect the undo history
   */
  get geojsonClone(): TsFeatureCollection {
    return JSON.parse(JSON.stringify( {
      type: 'FeatureCollection',
      features: this._geoJson.features
    }));
  }


  /**
   * Returns a single array listing all the corodinates from all features, with duplicate
   * first/last coords removed
   */
  get getPositionsArray(): Array<TsPosition> {

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


  getFeature(featureIndex: number) {
    // returns the desired feature on the active path
    return this._geoJson.features[featureIndex];
  }


  /**
   * Returns the feature and coordinate **indices** of a given coordinate as a TsPosition
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
   */
  get pointsGeoJson() {

    return this.geoJsonPipe.transform(this.positionsList, 'Point');

  }


  // get startEndPoints() {

  //   return this.geoJsonPipe.transform(
  //     [this.firstPoint, this.lastPoint], 'Point', [{title: 'start'}, {title: 'end'}]
  //   );
  // }

  // get startEndPoints() {
  //   return [this.firstPoint, this.lastPoint];
  // }

}
