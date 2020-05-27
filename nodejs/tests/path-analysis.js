
/**
 * This test imports test route, creates a Path object and compares the calculated
 * path properties against our expectations
 */

import chai from 'chai';
import chaiAsPromised from "chai-as-promised";
var expect = chai.expect;
var reject = chai.reject;
chai.use(chaiAsPromised);
import 'dotenv/config.js';

import { readFile } from 'fs';
import { getRouteInstance } from '../src/app-functions.js';
import { gpxRead } from '../src/gpx-read-write.js';
import { OUT_AND_BACK, CIRCULAR, ONE_WAY, NO_DIRECTION, ANTI_CLOCKWISE, CLOCKWISE, NO_CATEGORY} from '../src/globals.js';
import { PC_THRESH_UPP, PC_THRESH_LOW, FIGURE_OF_EIGHT} from '../src/globals.js';
import { analyseElevations } from '/__FILES/Gordon/PROJECT/Code/elbrus/nodejs/src/class-path-functions.js';

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
    
  });

  it('wrapper it to wait for promise.all to complete', function () {

    let testWithData = function (testItem) {

      return function () {

        before( function() {

          this.timeout(30000);

          return gpxToRoute(dir+testItem.fileName)
            .then( function(result) { 
              printSummary += getPrintSummary(testItem, result);
              const pcShared = Math.round(result._matchedPoints.length / result._points.length * 100);
              paramCheck.push({fn: testItem.fileName, category: testItem.category, direction: testItem.direction, pcShared, cw: result.info.cw});
              route = result;
            })
            .catch( function(error) { console.log(error) })

        });


        it('should have category ' + testItem.category, function() {
          return expect(route.info.category).to.equal(testItem.category)
        });

        it('should have direction ' + testItem.direction, function() {
          return expect(route.info.direction).to.equal(testItem.direction)
        });

        if (testItem.stravaDistanceMiles>0) {
          it('should have distance within 2% of ' + testItem.stravaDistanceMiles, function() {
            const distance = route.distance / 1000 * 0.62137;
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
    const actualDistance = route.stats.distance/1000*0.62137;
    const expectedElevation = testItem.stravaAscentFt;
    const actualElevation = route.stats.elevations.ascent * 3.28084;
    // console.log(route);
    return `
    *************************************************************************
    * File: ${testItem.fileName}
    * -----------------------------------------------------------------------
    * Number of Points = ${route._points.length}
    * Matched Points = ${route._matchedPoints.length}
    * pcShared = ${Math.round(route._matchedPoints.length / route._points.length * 100)}
    * Rotation score 'cw' = ${route.info.cw}
    * -----------------------------------------------------------------------
    * EXPECTED
    * Category =  ${testItem.category}
    * Direction = ${testItem.direction}
    * Distance = ${expectedDistance} miles 
    * Elevation = ${expectedElevation} ft 
    * ----------------------------------------------------------------------- 
    * ACTUAL
    * Category =  ${route.info.category}
    * Direction = ${route.info.direction}
    * Distance = ${actualDistance.toFixed(2)} miles (deviation ${(((actualDistance - expectedDistance)/expectedDistance) * 100).toFixed(2)}%)
    * Elevation = ${actualElevation.toFixed(2)} ft (deviation ${(((actualElevation - expectedElevation)/expectedElevation) * 100).toFixed(2)}%))
    * Lumpiness = ${route.stats.elevations.lumpiness.toFixed(2)} m/km
    ************************************************************************* 
    `
  }



  function gpxToRoute(fn) {

    return new Promise( async (res, rej) => { 

      // both thenning and awaiting seem to work, left both in for future reference

      // loadFile(fn)
      //   .then( function(buffer) { return gpxRead(buffer.toString()) })
      //   .then( function(pathFromGPX) { return getRouteInstance(pathFromGPX.name, null, pathFromGPX.lngLat, pathFromGPX.elev) })
      //   .then( function(routeInstance) { res(routeInstance.asMongoObject('testId', 'testUserName', false)) })
      //   .catch( function(error) {console.log(error)} )

      const buffer = await loadFile(fn);
      const pathFromGPX = gpxRead(buffer.toString());
      const routeInstance = await getRouteInstance(pathFromGPX.name, null, pathFromGPX.lngLat, pathFromGPX.elev);

      res(routeInstance);
      return routeInstance;
    
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

