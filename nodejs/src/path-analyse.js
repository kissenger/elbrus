"use strict"

/**
 * Functions directly supporting the PathWithStats class
 */

const geoFunctions = require('geo-points-and-paths').geoFunctions;
const debugMsg = require('./debug').debugMsg;

const START_AT_END_THRESH =      require('./globals').START_AT_END_THRESH;
const PC_THRESH_UPP =            require('./globals').PC_THRESH_UPP;
const PC_THRESH_LOW =            require('./globals').PC_THRESH_LOW;
const ROTATION_RANGE_TOL =       require('./globals').ROTATION_RANGE_TOL;
const CW_CIRC_THRESHOLD =        require('./globals').CW_CIRC_THRESHOLD;
const MATCH_DISTANCE =           require('./globals').MATCH_DISTANCE;
const MATCH_BUFFER =             require('./globals').MATCH_BUFFER;
const CW_TOLERANCE =             require('./globals').CW_TOLERANCE;
const BEARING_SECTIONS =         require('./globals').BEARING_SECTIONS;
const OUT_AND_BACK =             require('./globals').OUT_AND_BACK;
const CIRCULAR =                 require('./globals').CIRCULAR;
const ONE_WAY =                  require('./globals').ONE_WAY;
const NO_DIRECTION =             require('./globals').NO_DIRECTION;
const ANTI_CLOCKWISE =           require('./globals').ANTI_CLOCKWISE;
const CLOCKWISE =                require('./globals').CLOCKWISE;
const NO_CATEGORY =              require('./globals').NO_CATEGORY;
const FIGURE_OF_EIGHT =          require('./globals').FIGURE_OF_EIGHT;



/**
 * Categorises the path based on shape (circular, out-and-back, etc)
 * Run within the scope of PathWithStats
 *
 * Principle is to find the number of points on the route that are 'coincident', i.e.
 * if a point on the way out is close to a point on the way back
 * 
 * Some points on the algorthim:
 *    > pcshared is the number of matched points over the number of points in total, and is
 * used to identify whether a route repeats itslef or not. It is an expensive algorithm
 *    > cw (from 'clockwise sum') is a 'rotational score' indicating a tendency towards a circular
 * route.  The sign of cw also indicates rotational direction (+=clockwise, -=anti-c/w).  cw 
 * is calculated from analyseBearings() with the origin at the centre of the path bounding box -
 * this gives a much stronger indication of rotation than having the path start point as the 
 * origin.
 *    > range is the difference between the maximum and minimum bearing from the path start point
 * to each path point (ignoring skipping).  This helps to indicate how much of a circle a 
 * one-way path might go through, so that even a one-way path can be given a rotational direction -
 * perfect example is the s/w coastal path. Note that rotational score is not good for this because a 
 * one way stright line with cog at its centre will have a high rotational score )
 *  
 * 
 */
function analysePath(path) {
  
  debugMsg(`analysePath, ${path.properties.info.name}`);

  const pathLength = path.properties.stats.nPoints;
  // const lngLats = path.points;

  const matchedPoints = getMatchedPoints(path);
  const pcShared = matchedPoints.length / pathLength * 100; 
  const isStartAtEnd = geoFunctions.p2p(path.points[0], path.points[pathLength-1]) < (START_AT_END_THRESH);
  let category = NO_CATEGORY;
  let direction = NO_DIRECTION;

  
  // const boundingBox = this.boundingBox;
  const origin = {
    lat: (path.properties.stats.bbox.maxLat + path.properties.stats.bbox.minLat)/2,
    lng: (path.properties.stats.bbox.maxLng + path.properties.stats.bbox.minLng)/2
  }
  const {cw, _brngRange} = bearingAnalysis(path.points, origin);         // best signal for cw by taking origin at the cog of the route
  const {_cw, brngRange} = bearingAnalysis(path.points, path.points[0]);   // best signal for brngRange byt taking origin as the start point

  /**
  *                         CATEGORISATION LOGIC
  * CIRCULAR
  *   ends at the start and has high rotational score
  * OUT_AND_BACK
  *   ends at the start and has lots of shared points
  * FIGURE_OF_EIGHT
  *   ends at the start, has a low rotational score (cw < CW_THRESH) and few coincident points
  * ONE_WAY
  *   does not start and end at the same place and has few coincident points (n < PC_THRESH_LOW)
  * NO_CATEGORY
  *   Doesn't match any of the above - uncategorisable
  * 
  * Effect of cw is to distiguish between circular and fig of 8
  */
  if ( !isStartAtEnd ) { 
    if ( pcShared < PC_THRESH_LOW ) { category =  ONE_WAY; }

  } if ( isStartAtEnd ) {
    
    if ( Math.abs(cw) > CW_CIRC_THRESHOLD ) { category = CIRCULAR }
    else if ( Math.abs(cw) < CW_CIRC_THRESHOLD && pcShared < PC_THRESH_LOW ) { category = FIGURE_OF_EIGHT }
    else if ( pcShared > PC_THRESH_UPP ) { category = OUT_AND_BACK }
  } 

  /**
  *                     DIRECTION LOGIC
  * ONE_WAY
  *   If max - min bearing < RANGE_TOL, get a linear direction otherwise get a rotational direction
  * OUT_AND_BACK
  *   Direction is meaningless, return NO_DIRECTION
  * CIRCULAR
  *   Get a rotational direction according to sign of cwSum
  * NO_CATEGORY
  *   return NO_DIRECTION
  */
  if ( category === ONE_WAY && brngRange < ROTATION_RANGE_TOL ) {
  // if ( category === ONE_WAY && cw <= CW_CIRC_THRESHOLD ) {  <-- tried this, it didnt work
    direction = getLinearDirection(path.points[0], path.points[pathLength-1]);

  } else if ( category === CIRCULAR || ( category === ONE_WAY && cw > CW_CIRC_THRESHOLD ) ) {

    if ( cw > 0 ) direction = ANTI_CLOCKWISE;
    else if ( cw < 0 ) direction = CLOCKWISE;

  } 

  return {cw, category, direction, matchedPoints}
}
  


/**
 * TODO: THIS IS AN EXPENSIVE ALGORTHM AND ALTERNATIVE METHODS NEED TO BE FOUND
 * NN based route identification is the ultimate goal...
 * 
 * Returns an array of matched point pairs, useful for route categorisation but also sent to front end for debugging
 * Run within the scope of PathWithStats
 * 
 * Note on parameters:
 *    > Match distance is the distance below which to consider pairs as matching - changing this will 
 * have a direct impact on the number of points matched (pcShared in analyseRoute) so change with care
 *    > Match buffer is the number of points to skip when looking ahead - prevents matching with the next
 * points in the path.  Tempting to make high to reduce number of points analysed, but have found this leads
 * to matched points being missed
 * 
 */
function getMatchedPoints(path) {

  debugMsg('PointsList.getMatchedPoints()');

  const mp = [];
  for ( let i = 0; i < path.properties.stats.nPoints; i++ ) {  // look at each point
    for ( let j = i + MATCH_BUFFER; j < path.properties.stats.nPoints; j++ ) {  // look at each point ahead of it

      const dist = geoFunctions.p2p(path.points[i], path.points[j]);
      if ( dist < MATCH_DISTANCE ) {
        mp.push([i, j]);
        break;

      // if dist is a high number, skip some points as we know the next point is not going to be a match also
      // number of points to skip is the calculated distance over the threshold
      } else if ( dist > MATCH_DISTANCE * 10 ) {
        j += Math.round(0.5 * dist / MATCH_DISTANCE);
      }
    }
  }

  return mp;

}



/**
 *  Calculates the bearing from the supplied origin to points along the path
 * 
 *  Calculates the bearing from the start point to successive points along the route
 *  Rotation direction dependent on whether this bearing is more often increasing (clockwise) or decreasing (anti-clockwise)
 *  If the range of max to min bearing is small then treat as one-way route and find such as "north to east"
 */
function bearingAnalysis(points, origin) {

  const nSkip = Math.ceil(points.length / BEARING_SECTIONS);
  let cwSum = 0;
  let thisBrng;
  let lastBrng;
  let delta;
  let range = {max:-360, min: 360};

  for ( let i = nSkip; i < points.length; i += nSkip ) {

    thisBrng = geoFunctions.bearing(origin, points[i]);
    if (i > nSkip) {
      
      delta = Math.abs(thisBrng - lastBrng) > 180 ? thisBrng - lastBrng - Math.sign(thisBrng - lastBrng) * 360 : thisBrng - lastBrng;

      range.max = thisBrng > range.max ? thisBrng : range.max;
      range.min = thisBrng < range.min ? thisBrng : range.min;
      thisBrng = lastBrng + delta;

      if ( Math.abs(delta) > CW_TOLERANCE ){
        cwSum = delta < 0 ? cwSum + 1 : cwSum - 1;
      }
    }

    lastBrng = thisBrng;

  }
  
  return {cw:  cwSum / BEARING_SECTIONS, brngRange: range.max - range.min}

}


/**
 *  Simply takes the bearing from the first to last point and converts this into a direction
 */
function getLinearDirection(firstPoint, lastPoint) {
  const bearing = geoFunctions.bearing(firstPoint, lastPoint);
  const cardinal = geoFunctions.bearingAsCardinal(bearing);
  return `${cardinal.from} to ${cardinal.to}`
}



module.exports = {
  analysePath
}


