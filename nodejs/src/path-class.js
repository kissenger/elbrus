"use strict"

/**
 * Extends the base Path class and assembles the properties that it knows about.  
 * Note refactor to support threads, which requires that no class method sare called
 * after the instantiation - they are not available on the class after being sent
 * to the thread pool as the objects are serialised. https://github.com/andywer/threads.js/issues/141
 */

const debugMsg = require('./debug').debugMsg;
const Path = require('geo-points-and-paths').Path;
const jael = require('jael');
jael.setPath(process.env.GEOTIFF_PATH);


const SHORT_PATH_THRESHOLD         = require('./globals').SHORT_PATH_THRESHOLD;
const LONG_PATH_THRESHOLD          = require('./globals').LONG_PATH_THRESHOLD;
const SIMPLIFICATION_FACTOR_PASS_1 = require('./globals').SIMPLIFICATION_FACTOR_PASS_1;
const SIMPLIFICATION_FACTOR_PASS_2 = require('./globals').SIMPLIFICATION_FACTOR_PASS_2;



/**
 * Extends Path class to provide additional Path analsysis and stats
 */

class PathWithStats extends Path{

  constructor(name, description, lngLat, elev, pathType) {


    debugMsg('PathWithStats');

    super(lngLat);

    if (elev.length > 0) {
      // this.addParam('elev', elev);
      this._isElevations = true;
    } else {
      this._isElevations = false;
    }

    const deltaDistance = this.deltaDistance;
    this.points = this.pointLikes;
    
    //note that geometry is incorrectly on properties - this is fixed in geoJson but would be nice to 
    // do it properly in the first place...
    this.pathData = {
      pathId: '0000',    // assumes that path is 'created'
      geometry: {
        type: 'LineString',
        coordinates: this.lngLats
      },
      info: {
        pathType,
        name,
        description,
        isLong: this.length > LONG_PATH_THRESHOLD,
        isElevations: this._isElevations
      },
      stats: {
        dDistance: deltaDistance,
        distance: this.distance,
        // cumDistance: this.cumulativeDistance,
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
        elev,
        cumDistance: this.cumulativeDistance
      }
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

      if (path.length > SHORT_PATH_THRESHOLD) {
        // path is not 'short' so simplify
        path.simplify(SIMPLIFICATION_FACTOR_PASS_1);
        debugMsg(`PathWithStats:preFlight --> ${path.length} points after simplification pass 1`);
      } else {
        // path is 'short', but simplify with low threshold to remove any duplicates
        path.simplify(0.1);
        debugMsg(`PathWithStats:preFlight --> ${path.length} points after simplification pass 0`);
      }

      // if the path is still long, be a bit more agressive
      if (path.length > LONG_PATH_THRESHOLD) {
        path.simplify(SIMPLIFICATION_FACTOR_PASS_2);
        debugMsg(`PathWithStats:preFlight --> ${path.length} points after second simplification pass 2`);
      }

      if (path.length < LONG_PATH_THRESHOLD) {
        if (!isElevationsProvided) {
          jael.getElevs( {points: path.pointLikes} )
            .then(elev => {
              resolve( {lngLat: path.lngLats, elev: elev.map(e => e.elev)} )
            })
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
    super(name, description, lngLat, elev, 'route');
  }

}

module.exports = {
  PathWithStats,
  Route
}






