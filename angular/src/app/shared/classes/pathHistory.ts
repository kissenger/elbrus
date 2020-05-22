
  import { TsCoordinate, TsFeatureCollection } from 'src/app/shared/interfaces';
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
     *   when the path becomes too long.
     */

    private history: Array<TsFeatureCollection> = [];

    constructor() {

      /**
       * Warning - need to make a deep clone of the emptyGeoJson object in order to
       * avoid it getting updated when we make changes below; this then causes errors
       * when undoing back to the start.  The commented lines did not work (interesting
       * though):
       * // const newGeoJson = {...emptyGeoJson};
       * // const newGeoJson = Object.assign({}, emptyGeoJson);
       */
      const newGeoJson = JSON.parse(JSON.stringify(emptyGeoJson));

      this.history.push(newGeoJson);
      this.history[0].properties.pathId = '0000';
    }

    coords(): Array<TsCoordinate> {
      // return only the coordinates from the last geoJson, note there could be multiple features so concat first
      const coords = this.history[this.history.length - 1].features.reduce( (a, b) => a.concat(b.geometry.coordinates), []);
      return coords.map(c => ({lng: c[0], lat: c[1]}));
    }

    elevs() {
     // return only the elevations from the last geoJson
     return this.history[this.history.length - 1].properties.params.elev;
    }

    geoJson() {
      // return the last GeoJson in the history
      return this.history[this.history.length - 1];
    }

    setFirstPoint(point: TsCoordinate) {
      // after first click, save coords to the coordinate array on the existing first geoJson
      this.history[0].features[0].geometry.coordinates[0] = [point.lng, point.lat];
    }

    isFirstPointSet(): boolean {
      return !!this.history[0].features[0].geometry.coordinates[0];
    }

    add(geoJson: TsFeatureCollection) {
      // push new path to history
      this.history.push(geoJson);
    }

    undo() {
      // remove the most recent item in the history
      this.history.pop();
    }

    lastPoint(): TsCoordinate {
      // return the last point in the last geojson
      const coords = this.coords();
      return coords[coords.length - 1];
    }

    firstPoint(): TsCoordinate {
      // return the first point on the path
      const firstPoint = this.history[0].features[0].geometry.coordinates[0];
      return {lng: firstPoint[0], lat: firstPoint[1]};
    }


    length() {
      return this.history.length;
    }
  }
