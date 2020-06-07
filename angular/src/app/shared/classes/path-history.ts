
  import { TsCoordinate, TsFeatureCollection, TsFeature, TsPosition, TsPoint } from 'src/app/shared/interfaces';
  import { emptyGeoJson } from '../globals';

  export class PathHistory {

    /**
     * Class to store the history of paths when a user creates on the map, allowing
     * undo functionality.  Some points of note:
     * - the full geoJson after each click is stored. This allows undo to be very quick,
     *   eliminates errors from re-evaluating paths and allows to store all the params and
     *   props to send to details panel
     * - iaw DRY, no other arrays are kept; when the calling function want the coordinates
     *   or elevations they are pulled off the last geojson element in the array
     * - TODO: This is relatively expensive in terms of storage, but undo is quick, may cause
     *   problems for very long routes??  If so could loot at knocking off older history items
     *   when the undo history becomes too long.
     */

    private history: Array<TsFeatureCollection> = [];

    constructor(existingGeoJson = null) {

      /**
       * Warning - need to make a deep clone of the emptyGeoJson object in order to
       * avoid it getting updated when we make changes below; this then causes errors
       * when undoing back to the start.  The commented lines did not work (interesting
       * though):
       * // const newGeoJson = {...emptyGeoJson};
       * // const newGeoJson = Object.assign({}, emptyGeoJson);
       */
      if (existingGeoJson) {
        this.history.push(existingGeoJson);
      } else {
        const newGeoJson = JSON.parse(JSON.stringify(emptyGeoJson));
        this.history.push(newGeoJson);
      }

      this.history[0].properties.pathId = '0000';

    }


    get elevs() {
     // return only the elevations from the last geoJson
     return this.history[this.history.length - 1].properties.params.elev;
    }


    set firstPoint(point: TsCoordinate) {
      // after first click, save coords to the coordinate array on the existing first geoJson
      this.history[0].features[0].geometry.coordinates[0] = [point.lng, point.lat];
    }


    add(geoJson: TsFeatureCollection) {
      // push new path to history
      this.history.push(geoJson);
    }


    undo() {
      // remove the most recent item in the history and return the new last item
      this.history.pop();
    }


    get firstPoint(): TsCoordinate {
      // return the first point on the path - if its not set, return null
      if (!this.history[0].features[0].geometry.coordinates[0]) {
        return null;
      } else {
        const firstPoint = this.history[0].features[0].geometry.coordinates[0];
        return {lng: firstPoint[0], lat: firstPoint[1]};
      }

    }


    get length() {
      return this.history.length;
    }


    /**
     *
     * Methods acting on the last entry in the history (the 'active path')
     */

    get activePath() {
      // return the last GeoJson in the history
      return this.history[this.history.length - 1];
    }


    get activePathCoords(): Array<TsCoordinate> {
      // return only the coordinates from the last geoJson, note there could be multiple features so concat first
      // NOTE this returns duplicate points where lines meet (last point of feature n and first point of feature n+1)
      const coords = this.history[this.history.length - 1].features.reduce( (a, b) => a.concat(b.geometry.coordinates), []);
      return coords.map(c => ({lng: c[0], lat: c[1]}));
    }


    get activePathFeaturesLength() {
      return this.activePath.features.length;
    }


    get lastPoint(): TsCoordinate {
      // return the last point in the last geojson
      return this.activePathCoords[this.activePathCoords.length - 1];
    }


    activePathFeature(featureIndex) {
      // returns the desired feature on the active path
      return this.activePath.features[featureIndex];
    }


    updatePoint(featureIndex: number, coordIndex: number, newCoords: TsPosition) {
      this.activePath.features[featureIndex].geometry.coordinates[coordIndex] = newCoords;
    }


    /**
     * Returns the feature and coordinate indices of a given coordinate as a TsPosition
     */
    activePathMatchFeature(pointCoord: TsPosition) {

      const nFeatures = this.activePathFeaturesLength;
      const stringyCoord = JSON.stringify(pointCoord);

      // for loops chosen as need access to indexes, and need to be able to jump out of loop
      for (let fi = 0; fi < nFeatures; fi++) {
        const nCoords = this.activePath.features[fi].geometry.coordinates.length;
        for (let ci = 0; ci < nCoords; ci++) {
          if (JSON.stringify(this.activePath.features[fi].geometry.coordinates[ci]) === stringyCoord) {
            const result = [{featureIndex: fi, coordIndex: ci}];
            if (fi !== nFeatures - 1 && ci === nCoords - 1) {
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
  get activePoints() {


    if (this.activePath.features.length === 0)  {
      return getFeatureCollection([getPointFeature([this.firstPoint.lng, this.firstPoint.lat], '0', 'start')]);
    }

    const coordsArray = [];

    // get list of coordinates from all features
    this.activePath.features.forEach( (feature, fi) => {
      feature.geometry.coordinates.forEach( (coord, ci) => {
        if (fi !== 0 && ci === 0 ) {
          // prevents duplicating first point
        } else {
          coordsArray.push(coord);
        }
      });
    });

    // create features
    const pointFeatures = coordsArray.map( (coord, index) => {
      const text = index === 0 ? 'start' : index === coordsArray.length - 1 ? 'end' : null;
      return getPointFeature(coord, `${index}`, text);
    });

    return getFeatureCollection(pointFeatures);

    }
  }


function getFeatureCollection(features: Array<TsFeature>) {

  return <TsFeatureCollection>{
    type: 'FeatureCollection',
    features: features
  };
}

function getPointFeature(point: TsPosition, pointId: string, text?: string) {

  const feature =  <TsFeature> {
    type: 'Feature',
    id: pointId,
    geometry: <TsPoint>{
      type: 'Point',
      coordinates: point
    }
  };

  if (text) {
    feature.properties = {
      title: text
    };
  }

  return feature;
}



