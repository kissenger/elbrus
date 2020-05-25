"use strict"

/**
 * Module provides the classes:
 *
 * PathWithStats
 * Extends geo-points-and-paths Path class to provide application specific data
 * handling and processing, particularly the assembly of all the stats and info
 * needed by the front-end.  Accessed through its child classes, its effectively a
 * private class.
 * Includes the static method 'preFlight', which should be called first in order
 * to perform the preProcessing of path such as getting elevations if needed.
 *
 * Route
 * Extends PathWithStats and is the 'public' interface
 *
 */

import geolib from 'geo-points-and-paths';
import jael from 'jael';
const {Point, Path, geoFunctions} = geolib;
jael.setPath(process.env.GEOTIFF_PATH);
console.log(process.env.GEOTIFF_PATH);

import { debugMsg } from './debugging.js';
import * as globals from './globals.js';
import { getCategory, getDirection, getMatchedPoints, analyseElevations } from './class-path-functions.js';

/**
 * Extends Path class to provide additional Path analsysis and stats
 */

export class PathWithStats extends Path{

  constructor(name, description, lngLat, elev) {

    debugMsg('PathWithStats');

    super(lngLat);

    if (elev.length > 0) {
      this.addParam('elev', elev);
      this._isElevations = true;
    } else {
      this._isElevations = false;
    }

    // dont reorder, these need bt be on the instance before the .applys are called below
    this._name = name;
    this._description = description;
    this._isLong = this.length > globals.LONG_PATH_THRESHOLD;
    this._distanceData = this.distanceData;

    this._elevationData = analyseElevations.apply(this);
    this._matchedPoints = getMatchedPoints.apply(this);

  }


  // Perform pre-flight checks on provided points and elevations - get elevations from jael if needed
  static preFlight(lngLats, elev) {

    return new Promise( (resolve, reject) => {

      // check quality of elevations - for now dump elevations if there are any nulls
      // TODO: In future fill in if there are minor gaps in elevation profile
      if (elev) {
        elev = elev.every(e => !!e) ? elev : null;
      }

      const isElevationsProvided = !!elev;
      const path = new Path(lngLats);
      if (isElevationsProvided) {
        path.addParam('elev', elev);
      };
      
      path.simplify(2);
      debugMsg(`PathWithStats:preFlight - ${path.length} points after simplification`);

      // if the path is still long, be a bit more agressive
      if (path.length > globals.LONG_PATH_THRESHOLD) {
        path.simplify(10);
        debugMsg(`PathWithStats:preFlight - ${path.length} points after second simplification`);
      }

      if (path.length < globals.LONG_PATH_THRESHOLD) {
        if (!isElevationsProvided) {
          jael.getElevs( {points: path.pointLikes} )
            .then(elev => resolve( {lngLat: path.lngLats, elev: elev.map(e => e.elev)} ))
            .catch(error => reject(error))
        } else {
          resolve( {lngLat: path.lngLats, elev: path.getParam('elev')} );
        }
      } else {
        resolve( {lngLat: path.lngLats, elev: []});
      }
    })
  }


  get info() {
    this._category = getCategory.apply(this)
    return {
      pathType: this._pathType,
      name: this._name,
      description: this._description,
      isLong: this._isLong,
      isElevations: this._isElevations,
      category: this._category,
      direction: getDirection.apply(this)
    }
  }


  get stats() {

    const stats = {
      ...this._distanceData,
      ...this._elevationData,
      bbox: this.boundingBox,
      nPoints: this.length,
      simplificationRatio: this.simplificationRatio,
    };

    delete stats.smoothedElev;   // this belongs on the param array

    return stats;
  }


  get params() {

    const params = {
      matchedPoints: this._matchedPoints,
      cumDistance: this.cumulativeDistance,
    };

    if (this._isElevations) {
      params.smoothedElev = this._elevationData.smoothedElev;
      params.elev = this.getParam('elev');
    }

    return params;
  }


  get distanceData() {

    const deltaDistance = this.deltaDistance;
    return{
      distance: this.distance,
      dDistance: deltaDistance,
      nPoints: this.length,
      p2p: {
        max: Math.max(...deltaDistance),
        ave: deltaDistance.reduce( (a, b) => a+b, 0) / this.length
      }
    }

  }


  get properties() {
    return {
      pathId: '0000',    // assumes that path is 'created'
      params: this.params,
      stats: this.stats,
      info: this.info
    }
  }


  asMongoObject(userId, isSaved) {
    return {
      userId: userId,
      isSaved: isSaved,
      geometry: {
        type: 'LineString',
        coordinates: this.lngLats
      },
      params: this.params,
      stats: this.stats,
      info: this.info
    }
  }

}


export class Route extends PathWithStats {

  constructor(name, description, lngLat, elev){
    super(name, description, lngLat, elev);
    this._pathType = 'route';
  }

}






