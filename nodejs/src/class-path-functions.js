"use strict"

/**
 * Functions directly supporting the PathWithStats class
 */

import geolib from 'geo-points-and-paths';
const {Point, Path, geoFunctions} = geolib;

import { debugMsg } from './debugging.js';
import * as globals from './globals.js';

/**
 * Returns an array of matched point pairs, useful for route categorisation but also sent to front end for debugging
 * Run within the scope of PathWithStats
 */
export function getMatchedPoints() {

  debugMsg('PointsList.getMatchedPoints()');

  const mp = [];
  for ( let i = 0; i < this.length; i++ ) {  // look at each point
    for ( let j = i + globals.MATCH_BUFFER; j < this.length; j++ ) {  // look at each point ahead of it

      const dist = geoFunctions.p2p(this.getPoint(i), this.getPoint(j));
      if ( dist < globals.MATCH_DISTANCE ) {
        // console.log(dist, globals.MATCH_DISTANCE)
        mp.push([i, j]);
        break;

      // if dist is a high number, skip some points as we know the next point is not going to be a match also
      // number of points to skip is the calculated distance over the threshold
      } else if ( dist > globals.MATCH_DISTANCE * 10 ) {
        // j += Math.round(0.8*dist / MATCH_DISTANCE);
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
 * - Circular
 *     1/ starts and ends at the same point
 *     2/ has few coincident points (n < PC_THRESH_LOW)
 * - Out and back
 *     1/ shares lots of coincident points (n > PC_THRESH_HIGH)
 *     NOTE does not need to start and end at the same place
 * - One way
 *     1/ does not start and end at the same place
 *     2/ has few coincident points (n < PC_THRESH_LOW)
 * - Hybrid
 *     Doesn't really match any of the above - uncategorisable
 */
export function getCategory() {
// gets called in the context of path class
  debugMsg('PointsList.getCategory()');

  const pcShared = this._matchedPoints.length / this.length * 100 * 2;  //(x2 becasue only a max 1/2 of points can be matched)
  const isStartAtEnd = geoFunctions.p2p(this.firstPoint, this.lastPoint) < (globals.START_AT_END_THRESH);

  if ( pcShared > globals.PC_THRESH_UPP ) { return 'Out and back'; }
  if ( isStartAtEnd && pcShared < globals.PC_THRESH_LOW ) { return 'Circular'; }
  if ( !isStartAtEnd && pcShared > globals.PC_THRESH_UPP ) { return 'Out and back'; }
  if ( !isStartAtEnd && pcShared < globals.PC_THRESH_LOW ) { return 'One way'; }

  // if nothing else fits then call it a hybrid
  return 'None';

}



/**
 * Find the direction that a one-way or circular route is taking
 * Run within the scope of PathWithStats
 */
export function getDirection() {

  debugMsg('PointsList.getDirection()');

  if ( this._category === 'Circular' ) {
    return getDirectionOfCircularPath();
  } else if ( this._category === 'One way' ) {
    return getDirectionOfOneWayPath(this.firstPoint, this.lastPoint);
  } else {
    return 'N/A';
  }

}


/**
 *   Works by calculating the bearing from the successive points on route and determining
 *   if this bearing is more often increasing (clockwise) or decreasing (anti-clockwise)
 */
function getDirectionOfCircularPath() {

  const isBearingChangeSmall = (thisB, lastB) => Math.abs(thisB - lastB) > Math.PI
  const nSkip = Math.ceil(path.length / 20);
  let clockWiseSum = 0;
  let lastBearing = geoFunctions.bearing(this.firstPoint, this.getPoint(nSkip));
  let thisBearing;

  for ( let i = 2 * nSkip; i < path.length; i += nSkip ) {

    thisBearing = geoFunctions.bearing(this.getPoint(i - nSkip), this.getPoint(i));
    if (isBearingChangeSmall(thisBearing, lastBearing)) {       // ignore point if delta is > 180deg (assume moved across 0degs)
      clockWiseSum += Math.sign(deltaBrg);        // increment if bearing is increasing, decrement if decreasing
    }

    lastBearing = thisBearing;
  }

  if ( clockWiseSum > 0 )   { return 'Clockwise'; }
  if ( clockWiseSum < 0 )   { return 'Anti-Clockwise'; }
  if ( clockWiseSum === 0 ) { return 'Unknown Direction'; }

}


/**
 *  Simply takes the bearing from the first to last point and converts this into a direction
 */
function getDirectionOfOneWayPath(firstPoint, lastPoint) {
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
export function analyseElevations() {

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
      if (Math.abs(dSum) > globals.ASCENT_THRESH) {
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
      if (Math.abs(hillSum) > globals.HILL_THRESH) {
        hillsArr.push([p0 - 1, i - 1]);
      }
      hillSum = de;
      p0 = i;
    }

  } // close for loop

  // check we didnt end on a hill
  if (Math.abs(dSum) > globals.ASCENT_THRESH) {
    if (dSum > 0) { ascent += dSum; }
    else { descent += dSum; }
  }
  if (Math.abs(hillSum) > globals.HILL_THRESH) {
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
      lumpiness: (ascent - descent) / distance
    },
    hills
  }

}


function getSmoothedElevations() {

  const isPathReallyShort = () => this.length < (globals.MOVING_AVERAGE_PERIOD * 2);
  const elevations = this.getParam('elev');

  if (isPathReallyShort()) {
    return elevations;
  } else {
    return movingAverage(elevations, globals.MOVING_AVERAGE_PERIOD)
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


