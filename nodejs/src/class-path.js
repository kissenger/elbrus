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

// const analysePath = require('./analyse-path.js').analysePath;
// const analyseElevations = require('./analyse-elevations.js').analyseElevations;
const debugMsg = require('./debugging').debugMsg;
const Path = require('geo-points-and-paths').Path;

const LONG_PATH_THRESHOLD            = require('./globals').LONG_PATH_THRESHOLD;
const SIMPLIFICATION_FACTOR_PASS_1   = require('./globals').SIMPLIFICATION_FACTOR_PASS_1;
const SIMPLIFICATION_FACTOR_PASS_2   = require('./globals').SIMPLIFICATION_FACTOR_PASS_2;

const jael = require('jael');
jael.setPath(process.env.GEOTIFF_PATH);



/**
 * Extends Path class to provide additional Path analsysis and stats
 */

class PathWithStats extends Path{

  constructor(name, description, lngLat, elev) {

    debugMsg('PathWithStats');

    super(lngLat);

    if (elev.length > 0) {
      // this.addParam('elev', elev);
      this._isElevations = true;
    } else {
      this._isElevations = false;
    }

    this.elev = elev;

    // dont reorder, these need bt be on the instance before the .applys are called below
    const deltaDistance = this.deltaDistance;

    this.properties = {
      pathId: '0000',    // assumes that path is 'created'
      geometry: {
        type: 'LineString',
        coordinates: this.lngLats
      },
      info: {
        pathType: this._pathType,
        name,
        description,
        isLong: this.length > LONG_PATH_THRESHOLD,
        isElevations: this._isElevations
      },
      stats: {
        dDistance: deltaDistance,
        distance: this.distance,
        cumDistance: this.cumulativeDistance,
        p2p: {
          max: Math.max(...deltaDistance),
          ave: deltaDistance.reduce( (a, b) => a+b, 0) / this.length
        },
        nPoints: this.length,
        bbox: this.boundingBox,
        nPoints: this.length,
        simplificationRatio: this.simplificationRatio,
      },
      params: {
        cumDistance: this.cumulativeDistance
      }
    }

    if (this.properties.info.isElevations) {
      this.properties.params.elev = this.getParam('elev');
    }

  }


  // Perform pre-flight checks on provided points and elevations - get elevations from jael if needed
  static preFlight(lngLats, elev) {

    debugMsg('PathWithStats.preflight');

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
      
      path.simplify(SIMPLIFICATION_FACTOR_PASS_1);
      debugMsg(`PathWithStats:preFlight --> ${path.length} points after simplification pass 1`);

      // if the path is still long, be a bit more agressive
      if (path.length > LONG_PATH_THRESHOLD) {
        path.simplify(SIMPLIFICATION_FACTOR_PASS_2);
        debugMsg(`PathWithStats:preFlight --> ${path.length} points after second simplification pass 2`);
      }

      if (path.length < LONG_PATH_THRESHOLD) {
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
}


class Route extends PathWithStats {

  constructor(name, description, lngLat, elev){
    super(name, description, lngLat, elev);
    this._pathType = 'route';
  }

}

module.exports = {
  PathWithStats,
  Route
}






