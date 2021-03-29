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

  constructor(name, description, activityType, lngLats, elevs, pathType) {


    debugMsg('PathWithStats');

    super(lngLats);

    if (elevs.length > 0) {
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
        isElevations: this._isElevations,
        activityType: activityType,
        startPoint: this.lngLats[0],
        endPoint: this.lngLats[this.lngLats.length - 1]
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
        elevs,
        cumDistance: this.cumulativeDistance
      }
    }

  }


  // Perform pre-flight checks on provided points and elevations - get elevations from jael if needed
  static preFlight(lngLats, elevs) {

    debugMsg('PathWithStats.preflight');

    return new Promise( (resolve, reject) => {

      // check quality of elevations - for now dump elevations if there are any nulls
      // TODO: In future fill in if there are minor gaps in elevation profile
      if (elevs) {
        elevs = elevs.every(e => !!e) ? elevs : null;
      }

      const isElevationsProvided = !!elevs;
      const path = new Path(lngLats);
      if (isElevationsProvided) {
        path.addParam('elevs', elevs);
      };

      if (path.length > SHORT_PATH_THRESHOLD) {
        // path is not 'short' so simplify
        path.simplify(SIMPLIFICATION_FACTOR_PASS_1);
        debugMsg(`PathWithStats:preFlight --> ${path.length} points after simplification pass 1`);
      } else {
        // path is 'short', but simplify with low threshold to remove any duplicates
        path.simplify(0.01);
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
            .then(elevs => {
              resolve( {lngLats: path.lngLats, elevs: elevs.map(e => e.elev)} )
            })
            .catch(error => reject(error))
            
        } else {
          resolve( {lngLats: path.lngLats, elevs: path.getParam('elevs')} );
        }
      } else {
        resolve( {lngLats: path.lngLats, elevs: []});
      }
    })

  }
}


class Route extends PathWithStats {

  constructor(name, description, activityType, lngLats, elevs){
    super(name, description, activityType, lngLats, elevs, 'route');
  }

}

module.exports = {
  PathWithStats,
  Route
}






