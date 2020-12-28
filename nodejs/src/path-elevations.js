
"use strict"

/**
 * Functions supporting the analysis (not getting, which is done in preflight) of elevations
 */

const debugMsg = require('./debug').debugMsg;
const ASCENT_THRESH =            require('./globals').ASCENT_THRESH;
const HILL_THRESH =              require('./globals').HILL_THRESH;
const MOVING_AVERAGE_PERIOD =    require('./globals').MOVING_AVERAGE_PERIOD;

 /**
  * Return stats relevant to elevations
  * NOTE this is called using 'apply' from PathWithStats class so this refers to that scope
  *
  * TODO: Improvements to be made:
  * needs another refactor - those ascent calcs should be seperate routines
  * filter hills array in postprocessing to remove aveGrad < thresh
  * Also detect adjacent hill with few points or small drop between and combine (or better algorithm in the first place)
  *
  */
 function analyseElevations(path) {

  debugMsg(`analyseElevations, ${path.pathData.info.name}`);

  // distance data needed to caculate gradients
  const dDistance = path.pathData.stats.dDistance;
  const distance = path.pathData.stats.distance;
  const cumDistance = path.pathData.params.cumDistance;

  // const elevations = this.getParamFromPoints('elev');
  const smoothedElevations = getSmoothedElevations(path.pathData.params.elev);
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
  for (let i = 1; i < path.pathData.stats.nPoints; i++ ) {

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
    hillsArr.push([p0 - 1, path.pathData.stats.nPoints - 1]);
  }
  
  // get stats for each hill in the list
  const hills = hillsArr.map( hill => 
    ({
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


function getSmoothedElevations(elev) {

  const isPathReallyShort = () => elev.length < (MOVING_AVERAGE_PERIOD * 2);

  if (isPathReallyShort()) {
    return elev;
  } else {
    const moveAve = movingAverage(elev, MOVING_AVERAGE_PERIOD);
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
  analyseElevations
}
