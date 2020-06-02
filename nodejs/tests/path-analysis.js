"use strict"

/**
 * This test imports test route, creates a Path object and compares the calculated
 * path properties against our expectations
 * 
 * Use of threads does not seem to impact speed for mocha tests although I havent spent the
 * time to fugure out why. Speed tests for threads is done in seperate file.
 */

const chai = require('chai');
var expect = chai.expect;
var reject = chai.reject;
require('dotenv').config();

const readFile = require('fs').readFile;
const getRouteInstance = require('../src/path-helpers').getRouteInstance;
const gpxRead = require('../src/gpx').gpxRead;

const USE_THREADS = true;
let threadPool;

if (USE_THREADS) {
  threadPool = require('../src/worker-pool').threadPool;
  threadPool.create();
}

const OUT_AND_BACK =    require('../src/globals').OUT_AND_BACK;
const CIRCULAR =        require('../src/globals').CIRCULAR;
const ONE_WAY =         require('../src/globals').ONE_WAY;
const NO_DIRECTION =    require('../src/globals').NO_DIRECTION;
const ANTI_CLOCKWISE =  require('../src/globals').ANTI_CLOCKWISE;
const CLOCKWISE =       require('../src/globals').CLOCKWISE;
const NO_CATEGORY =     require('../src/globals').NO_CATEGORY;
const FIGURE_OF_EIGHT = require('../src/globals').FIGURE_OF_EIGHT;

const startTime = new Date();
const dir = './tests/data/';
const testList = [
  {
    "fileName": "mendip_way.gpx",
    "direction": "West to East",
    "category": ONE_WAY,
    "stravaDistanceMiles": 0,
    "stravaAscentFt": 0
  },
  {
    "fileName": "double-loop.gpx",
    "direction": ANTI_CLOCKWISE,
    "category": CIRCULAR,
    "stravaDistanceMiles": 4.26,
    "stravaAscentFt": 82
  },
  {
    "fileName": "short-near-loop.gpx",
    "direction": CLOCKWISE,
    "category": CIRCULAR,
    "stravaDistanceMiles": 14.53,
    "stravaAscentFt": 1053
  },
  {
    "fileName": "short-out-and-back-complex.gpx",
    "direction": NO_DIRECTION,
    "category": OUT_AND_BACK,
    "stravaDistanceMiles": 5.08,
    "stravaAscentFt": 187
  },
  {
    "fileName": "very-out-and-back.gpx",
    "direction": NO_DIRECTION,
    "category": OUT_AND_BACK,
    "stravaDistanceMiles": 14.02,
    "stravaAscentFt": 4595
  },
  {
    "fileName": "long-circular-with-out-and-back-section.gpx",
    "direction": NO_DIRECTION,
    "category": FIGURE_OF_EIGHT,
    "stravaDistanceMiles": 14.33,
    "stravaAscentFt": 427
  },
  {
    "fileName": "mostly-out-and-back.gpx",
    "direction": NO_DIRECTION,
    "category": OUT_AND_BACK,
    "stravaDistanceMiles": 6.00,
    "stravaAscentFt": 568
  },
  {
    "fileName": "stretched-out-loop.gpx",
    "direction": ANTI_CLOCKWISE,
    "category": CIRCULAR,
    "stravaDistanceMiles": 11.46,
    "stravaAscentFt": 951
  },
  {
    "fileName": "complex-hybrid.gpx",
    "direction": CLOCKWISE,
    "category": CIRCULAR,
    "stravaDistanceMiles": 6.91,
    "stravaAscentFt": 1214
  },
  {
    "fileName": "loop-with-inner-loop.gpx",
    "direction": ANTI_CLOCKWISE,
    "category": CIRCULAR,
    "stravaDistanceMiles": 4.65,
    "stravaAscentFt": 259
  },  
  {
    "fileName": "two-loops.gpx",
    "direction": CLOCKWISE,
    "category": CIRCULAR,
    "stravaDistanceMiles": 5.80,
    "stravaAscentFt": 256
  },
  {
    "fileName": "Beyond_stunning.gpx",
    "direction": "West to East",
    "category": ONE_WAY,
    "stravaDistanceMiles": 9.40,
    "stravaAscentFt": 1416
  },
  {
    "fileName": "figure-of-eightish.gpx",
    "direction": ANTI_CLOCKWISE,
    "category": CIRCULAR,
    "stravaDistanceMiles": 7.03,
    "stravaAscentFt": 187
  },
  {
    "fileName": "figure-of-eight-bike.gpx",
    "direction": NO_DIRECTION,
    "category": FIGURE_OF_EIGHT,
    "stravaDistanceMiles": 7.68,
    "stravaAscentFt": 174
  },  
];
let printSummary = '';
let paramCheck = [];
let route;              // not declaring this has caused problems more than once, dont forget it

after ( function() {
  
  console.log(printSummary);
  console.table(paramCheck);
  console.log(`Completed in ${timeDiff(new Date() - startTime)}`) 
  
});

it('wrapper it to wait for promise.all to complete', function () {

  let testWithData = function (testItem) {

    return function () {

      before( function() {

        this.timeout(30000);

        return gpxToRoute(dir+testItem.fileName)
          .then( function(result) { 
            printSummary += getPrintSummary(testItem, result);
            // console.log('result', result);
            const pcShared = Math.round(result.properties.params.matchedPoints.length / result.properties.stats.nPoints * 100);
            paramCheck.push({fn: testItem.fileName, category: testItem.category, direction: testItem.direction, pcShared, cw: result.properties.info.cw});
            route = result;
          })
          .catch( function(error) { console.log(error) })

      });


      it('should have category ' + testItem.category, function() {
        return expect(route.properties.info.category).to.equal(testItem.category)
      });

      it('should have direction ' + testItem.direction, function() {
        return expect(route.properties.info.direction).to.equal(testItem.direction)
      });

      if (testItem.stravaDistanceMiles>0) {
        it('should have distance within 2% of ' + testItem.stravaDistanceMiles, function() {
          const distance = route.properties.stats.distance / 1000 * 0.62137;
          return expect(distance).to.satisfy(function(d) { return (d < 1.02*testItem.stravaDistanceMiles) && (d > 0.98*testItem.stravaDistanceMiles)});
        });
      }
      
      // dont bother testing elevations
      // if (testItem.stravaAscentFt>0) {
      //   it('should have ascent within 20% ' + testItem.stravaAscentFt, function() {
      //     const ascent = route.stats.elevations.ascent * 3.28084;
      //     console.log(`expected ${testItem.stravaAscentFt}, got ${ascent}`)
      //     return expect(ascent).to.satisfy(function(a) { return (a < 1.2*testItem.stravaAscentFt) && (a > 1/1.2*testItem.stravaAscentFt)});
      //   });
      // }

    };
  }; // testWithData


  //  loops through all the provided test cases, using the closure as an argument
  testList.forEach( function(testInfo) {
    describe("Testing file: " + testInfo.fileName , testWithData(testInfo));
  });


}); // it (hack)


function getPrintSummary(testItem, route) {


  const expectedDistance = testItem.stravaDistanceMiles;
  const actualDistance = route.properties.stats.distance/1000*0.62137;
  const expectedElevation = testItem.stravaAscentFt;
  const actualElevation = route.properties.stats.elevations.ascent * 3.28084;
  // console.log(route);
  return `
  *************************************************************************
  * File: ${testItem.fileName}
  * -----------------------------------------------------------------------
  * Number of Points = ${route.properties.stats.nPoints}
  * Matched Points = ${route.properties.params.matchedPoints.length}
  * pcShared = ${Math.round(route.properties.params.matchedPoints.length / route.properties.stats.nPoints * 100)}
  * Rotation score 'cw' = ${route.properties.info.cw}
  * -----------------------------------------------------------------------
  * EXPECTED
  * Category =  ${testItem.category}
  * Direction = ${testItem.direction}
  * Distance = ${expectedDistance} miles 
  * Elevation = ${expectedElevation} ft 
  * ----------------------------------------------------------------------- 
  * ACTUAL
  * Category =  ${route.properties.info.category}
  * Direction = ${route.properties.info.direction}
  * Distance = ${actualDistance.toFixed(2)} miles (deviation ${(((actualDistance - expectedDistance)/expectedDistance) * 100).toFixed(2)}%)
  * Elevation = ${actualElevation.toFixed(2)} ft (deviation ${(((actualElevation - expectedElevation)/expectedElevation) * 100).toFixed(2)}%))
  * Lumpiness = ${route.properties.stats.elevations.lumpiness.toFixed(2)} m/km
  ************************************************************************* 
  `
}



function gpxToRoute(fn) {

  return new Promise( async (res, rej) => { 
    
    const buffer = await loadFile(fn);
    const bufferString = buffer.toString();
    let gpxData;
    let routeInstance;

    if (USE_THREADS) {
      gpxData = await threadPool.addTaskToQueue('gpxRead', bufferString);  // use threads
      routeInstance = await threadPool.addTaskToQueue('getRouteInstance', gpxData.name, null, gpxData.lngLat, gpxData.elev);  // use threads
    } else {
      pathFromGPX = gpxRead(bufferString);
      routeInstance = await getRouteInstance(pathFromGPX.name, null, pathFromGPX.lngLat, pathFromGPX.elev);
    }

    res(routeInstance);
  
  })
}


/**
 * Load the data from the requested file into a buffer and give back a promise
 */
function loadFile(fn) {
  return new Promise ( (res, rej) => {
    readFile(fn, (err, data) => {
      if (err) {
        rej(err);
      };
      res(data);
    })

  })
}

function timeDiff(ms) {

  // var msec = diff;
  const hh = Math.floor(ms / 1000 / 60 / 60);
  ms -= hh * 1000 * 60 * 60;
  const mm = Math.floor(ms / 1000 / 60);
  ms -= mm * 1000 * 60;
  const ss = Math.floor(ms / 1000);
  ms -= ss * 1000;

  return String(hh).padStart(2,'0')+':'+
         String(mm).padStart(2,'0')+':'+
         String(ss).padStart(2,'0')+':'+
         String(ms).padStart(3,'0');
}

