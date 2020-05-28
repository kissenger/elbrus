"use strict"

/**
 * Functions directly supporting the PathWithStats class
 */

const {Point, Path, geoFunctions} = require('geo-points-and-paths');
const debugMsg = require('./debugging').debugMsg;

const START_AT_END_THRESH = require('./globals').START_AT_END_THRESH;
const PC_THRESH_UPP = require('./globals').PC_THRESH_UPP;
const PC_THRESH_LOW = require('./globals').PC_THRESH_LOW;
const ROTATION_RANGE_TOL = require('./globals').ROTATION_RANGE_TOL;
const CW_CIRC_THRESHOLD = require('./globals').CW_CIRC_THRESHOLD;
const MATCH_DISTANCE = require('./globals').MATCH_DISTANCE;
const MATCH_BUFFER = require('./globals').MATCH_BUFFER;
const ASCENT_THRESH = require('./globals').ASCENT_THRESH;
const HILL_THRESH = require('./globals').HILL_THRESH;
const MOVING_AVERAGE_PERIOD = require('./globals').MOVING_AVERAGE_PERIOD;
const CW_TOLERANCE = require('./globals').CW_TOLERANCE;
const BEARING_SECTIONS = require('./globals').BEARING_SECTIONS;
const OUT_AND_BACK = require('./globals').OUT_AND_BACK;
const CIRCULAR = require('./globals').CIRCULAR;
const ONE_WAY = require('./globals').ONE_WAY;
const NO_DIRECTION = require('./globals').NO_DIRECTION;
const ANTI_CLOCKWISE = require('./globals').ANTI_CLOCKWISE;
const CLOCKWISE = require('./globals').CLOCKWISE;
const NO_CATEGORY = require('./globals').NO_CATEGORY;
const FIGURE_OF_EIGHT = require('./globals').FIGURE_OF_EIGHT;

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
function getMatchedPoints() {

  debugMsg('PointsList.getMatchedPoints()');

  const mp = [];
  for ( let i = 0; i < this.length; i++ ) {  // look at each point
    for ( let j = i + MATCH_BUFFER; j < this.length; j++ ) {  // look at each point ahead of it

      const dist = geoFunctions.p2p(this.getPoint(i), this.getPoint(j));
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
function pathAnalysis() {
  
  debugMsg('PointsList.getCategory()');
  
  const pcShared = this._matchedPoints.length / this.length * 100; 
  const isStartAtEnd = geoFunctions.p2p(this.firstPoint, this.lastPoint) < (START_AT_END_THRESH);
  let category = NO_CATEGORY;
  let direction = NO_DIRECTION;

  
  // const boundingBox = this.boundingBox;
  const origin = {
    lat: (this.boundingBox.maxLat + this.boundingBox.minLat)/2,
    lng: (this.boundingBox.maxLng + this.boundingBox.minLng)/2
  }
  const {cw, _brngRange} = bearingAnalysis.apply(this, [origin]);            // best signal for cw by taking origin at the cog of the route
  const {_cw, brngRange} = bearingAnalysis.apply(this, [this.firstPoint]);   // best signal for brngRange byt taking origin as the start point

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

    direction = getLinearDirection(this.firstPoint, this.lastPoint);

  } else if ( category === CIRCULAR || ( category === ONE_WAY && cw > CW_CIRC_THRESHOLD ) ) {

    if ( cw > 0 ) direction = ANTI_CLOCKWISE;
    else if ( cw < 0 ) direction = CLOCKWISE;

  } 

  return {cw, category, direction}
}
  



/**
 *  Calculates the bearing from the supplied origin to points along the path
 * 
 *  Calculates the bearing from the start point to successive points along the route
 *  Rotation direction dependent on whether this bearing is more often increasing (clockwise) or decreasing (anti-clockwise)
 *  If the range of max to min bearing is small then treat as one-way route and find such as "north to east"
 */
function bearingAnalysis(origin) {

  const nSkip = Math.ceil(this.length / BEARING_SECTIONS);
  let cwSum = 0;
  let thisBrng;
  let lastBrng;
  let delta;
  let range = {max:-360, min: 360};

  for ( let i = nSkip; i < this.length; i += nSkip ) {

    thisBrng = geoFunctions.bearing(origin, this.getPoint(i));
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


 /**
  * Return stats relevant to elevations
  * NOTE this is called using 'apply' from PathWithStats class so this refers to that scope
  *
  * TODO: Improvements to be made:
  * needs another refactor - those ascent calcs should be seperate routines
  * filter hills array in postprocessing to remove aveGrad < thresh
  * Also detect adjacent hill with few points or small drop between and combine (or better algorithm in the first place)
  *
  * This is run in the context of the calling class, which makes testing difficult. Would be better to have a wrapper
  * that takes the required class data and calls lower level functions, which can then be tested without needing to
  * instantiate the class.
  */
function analyseElevations() {

  if (!this.isParamExistsOnAnyPoint('elev')) {
    return {};
  }

  // distance data needed to caculate gradients
  const dDistance = this._distanceData.dDistance;
  const distance = this._distanceData.distance;
  const cumDistance = this.cumulativeDistance;

  // const elevations = this.getParamFromPoints('elev');
  const smoothedElevations = getSmoothedElevations.apply(this);
  const grads = smoothedElevations.map( (e, i, eArr) => i === 0 ? 0 : (e - eArr[i-1]) / dDistance[i] * 100 );

  // initilise loop variables
  let de = 0;                 // cumulative change in elevation
  let p0 = 0;                 // point number at which hill begins
  const hillsArr = [];        // array to containg start and end points of hill as
  let hillSum = 0;            // cumulative change in height used to calculate hills
  let dSum = 0                // cumulative change in height used to calculate ascent/descent
  let ascent = 0;
  let descent = 0;

  // loop through points to calculate ascent and descent, and to detect hills
  for (let i = 1; i < this.length; i++ ) {

    de = smoothedElevations[i] - smoothedElevations[i-1];

    // Calculates the ascent and descent statistics
    if (Math.sign(dSum) === Math.sign(de)) {
      // same direction, increment
      dSum += de;

    } else {
      // change of direction, check threshold and increment if needed
      if (Math.abs(dSum) > ASCENT_THRESH) {
        if (dSum > 0) { ascent += dSum; }
        else { descent += dSum; }
      }
      dSum = de;
    }

    // Calculates the start and end points of hills and stashes them in hills array
    // This block is similar to above but because we need to use a different threshold, we need a new loop
    if (Math.sign(hillSum) === Math.sign(de)) {
      // same direction, increment
      hillSum += de;
    } else {
      // direction change, check threshold and store hill if needed
      if (Math.abs(hillSum) > HILL_THRESH) {
        hillsArr.push([p0 - 1, i - 1]);
      }
      hillSum = de;
      p0 = i;
    }

  } // close for loop

  // check we didnt end on a hill
  if (Math.abs(dSum) > ASCENT_THRESH) {
    if (dSum > 0) { ascent += dSum; }
    else { descent += dSum; }
  }
  if (Math.abs(hillSum) > HILL_THRESH) {
    hillsArr.push([p0 - 1, this.length - 1]);
  }

  // get stats for each hill in the list
  const hills = hillsArr.map( hill => ({
      dHeight: smoothedElevations[hill[1]] - smoothedElevations[hill[0]],
      dDist: cumDistance[hill[1]] - cumDistance[hill[0]],
      maxGrad: Math.max( ...grads.slice(hill[0], [hill[1]+1]).map( g => Math.abs(g) ) ),
      aveGrad: (smoothedElevations[hill[1]] - smoothedElevations[hill[0]]) / (cumDistance[hill[1]] - cumDistance[hill[0]]) * 100,
      startPoint: hill[0],
      endPoint: hill[1]
    })
  );

  return {
    smoothedElev: smoothedElevations,
    elevations: {
      ascent,
      descent,
      maxElev: Math.max(...smoothedElevations),
      minElev: Math.min(...smoothedElevations),
      lumpiness: (ascent - descent) / distance * 1000.0
    },
    hills
  }

}


function getSmoothedElevations() {

  const isPathReallyShort = () => this.length < (MOVING_AVERAGE_PERIOD * 2);
  const elevations = this.getParam('elev');

  if (isPathReallyShort()) {
    return elevations;
  } else {
    const moveAve = movingAverage(elevations, MOVING_AVERAGE_PERIOD);
    return moveAve.map( e => e.toFixed(1)*1);
  }

}


/**
 * Moving average function, used to smooth elevations
 * Note that number of points to average over is smaller at the start and end of the
 * array, due to the way I have chosen to implement it
 */
function movingAverage(array, period) {

  if (period % 2 === 0) throw Error('Moving average period should be odd');

  const shift = (period - 1) / 2;
  const movingAverage = array.map( (p, i, arr) => {
    const low = Math.max(i - shift, 0);
    const upp = Math.min(i + shift + 1, array.length);
    return arr.slice(low, upp).reduce((a,b) => a + b, 0) / (upp - low);
  })

  return movingAverage;

}

module.exports = {
  getMatchedPoints,
  pathAnalysis,
  analyseElevations
}


