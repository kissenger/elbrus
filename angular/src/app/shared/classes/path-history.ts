
  import { TsPosition } from 'src/app/shared/interfaces';
  import { Path } from './path-class';
  import { GeoJsonPipe } from 'src/app/shared/pipes/geojson.pipe';
  import { Injector } from '@angular/core';

  const UNDO_BUFFER = 5;

  export class PathHistory {

    private history: Array<Path>;
    private _firstPoint: TsPosition = null;
    private geoJsonPipe: GeoJsonPipe;
    private isBufferReached = false;

    constructor(path: Path = null) {

      // injects the services into the instance
      const injector = Injector.create({ providers: [ { provide: GeoJsonPipe, deps: [] } ] });
      this.geoJsonPipe = Object.getPrototypeOf(injector.get(GeoJsonPipe));

      // add the first path to history - note path is optional and set to null if not provided
      this.history = path ? [path] : [];

    }


    // set the fist point
    set firstPoint(point: TsPosition) {
      this._firstPoint = point;
    }



    // return the first point of the last path in the undo history
    get firstPoint() {

      // first try to return the first point of the last path - in case route has been reversed
      if (this.lastPath) {
        return this.lastPath.firstPoint;

      // if that doesnt work, try to return _firstpoint
      } else if (this._firstPoint) {
        return this._firstPoint;

      // if none of that works, return null
      } else {
        return null;
      }

    }


    // return the last point of the last path in the undo history
    get lastPoint() {
      if ( this.lastPath ) {
        return this.lastPath.lastPoint;
      } else {
        return this._firstPoint;
      }
    }


    // get the number of undo points
    get length() {
      return this.history.length;
    }


    // return the last path in the undo history, or null if it doesnt exist
    get lastPath() {
      return this.length > 0 ? this.history[this.length - 1] : null;
    }


    // return an array of the point coordinates for the last path in the undo history
    get coords() {
      if ( this.lastPath ) {
        return this.lastPath.positionsList;
      } else {
        return [this._firstPoint];
      }
    }



    // Return the points for the last path in the undo history
    // If there isnt one, return firstpoint or empty geojson
    get activePoints() {
      if (this.lastPath) {
        return this.lastPath.pointsGeoJson;
      } else if (this.firstPoint) {
        return this.geoJsonPipe.transform([this.firstPoint], 'Point');
      } else {
        return this.geoJsonPipe.transform([], 'Point');
      }
    }


    // returns the bounding box of the last path in the undo history
    get boundingBox() {
      if ( this.lastPath ) {
        return this.lastPath.boundingBox;
      }
    }


    // returns a geojson containing the first and last points of the last path in the undo history
    // get startEndPoints() {

    //   let coords = [];
    //   let props = [];

    //   if (this.lastPath) {
    //     coords = [this.lastPoint];
    //     props = [{title: 'end'}];
    //   }

    //   if (this.firstPoint) {
    //     coords.unshift(this.firstPoint);
    //     props.unshift({title: 'start'});
    //   }

    //   return this.geoJsonPipe.transform(coords, 'Point', props);

    // }



    // return a simplified geojson clone of the most recent path in the undo history
    // minimise data sent to map for plotting
    // return an empty geojson if there are no paths in the history
    get geojsonClone() {

      if ( this.lastPath ) {
        return this.lastPath.geojsonClone;
      } else {
        return this.geoJsonPipe.transform([], 'LineString');
      }

    }



    // returns the full geoJson data for the most recent path in undo history
    // full data sent to details panel for stats display
    get geoJson() {

      if ( this.lastPath ) {
        return this.lastPath.geoJson;
      } else if (this.firstPoint) {
        return this.geoJsonPipe.transform([this.firstPoint], 'Point');
      } else {
        return null;
      }

    }


    get nPoints() {
      return this.lastPath.positionsList.length;
    }


    // clear the undo history
    clear() {
      this.history = [];
      this._firstPoint = null;
      this.isBufferReached = false;
    }


    // returns the coordinates of a given point on the last path
    coordsAtIndex(pointIndex: number): TsPosition {
      if ( this.lastPath ) {
        return this.lastPath.positionsList[pointIndex];
      } else if (this.firstPoint) {
        return this.firstPoint;
      }
    }


    // returns the feature in the last path that contains the desired point
    matchFeature(pointCoord: TsPosition) {
      if (this.lastPath) {
        return this.lastPath.matchFeature(pointCoord);
      } else {
        return null;
      }
    }



    // add a path to the undo history
    add(path: Path) {

      // if max length has already been achieved, knock one record off the beginning and flag that buffer has been exceeded
      if ( this.length === UNDO_BUFFER ) {
        this.history.shift();
        this.isBufferReached = true;
      }

      this.history.push(path);

    }


    // remove the last item in the history, but keep track of whether the buffer limit is reached as the
    // behaviour slightly changes
    pop() {

      // if buffer has been exceeded, dont pop the last line
      if (this.isBufferReached) {
        if ( this.length > 1 ) {
          this.history.pop();
          return true;
        } else {
          return false;
        }

      // otherwise pop away and return success
      } else {
        return !!this.history.pop();
      }

    }


    // remove the most recent item in the history and return true is something was removed, false if no more to undo
    // TODO: Logic is confused with pop, needs a rethink
    undo() {

      if (!this._firstPoint) {
        // this is an edited route, so firstPoint lastPoint etc not set - different behaviour
        if (this.length > 1) {
          this.pop();
          return true;
        } else {
          return false;
        }

      } else {

        // if pop was successful, then carry on
        if (this.pop()) {
          return true;

        // if failed there are no more line left to remove; only remove the firstPoint if buffer wasnt exceeded
        } else {
          if (!this.isBufferReached) {
            this.firstPoint = null;
            return true;
          } else {
            return false;
          }
        }
      }
    }
  }



