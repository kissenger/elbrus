
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

const dir = './tests/data/';

const testList = [
  {
    "fileName": "mendip_way.gpx",
    "direction": "West to East",
    "category": "One way",
    "stravaDistanceMiles": 0,
    "stravaAscentFt": 0
  },
  {
    "fileName": "double-loop.gpx",
    "direction": "Anti-Clockwise",
    "category": "Circular",
    "stravaDistanceMiles": 4.26,
    "stravaAscentFt": 82
  },
  {
    "fileName": "short-near-loop.gpx",
    "direction": "Clockwise",
    "category": "Circular",
    "stravaDistanceMiles": 14.53,
    "stravaAscentFt": 1053
  },
  {
    "fileName": "short-out-and-back-complex.gpx",
    "direction": "",
    "category": "Out and back",
    "stravaDistanceMiles": 5.08,
    "stravaAscentFt": 187
  },
  {
    "fileName": "very-out-and-back.gpx",
    "direction": "",
    "category": "Out and back",
    "stravaDistanceMiles": 14.02,
    "stravaAscentFt": 4595
  },
  {
    "fileName": "long-circular-with-out-and-back-section.gpx",
    "direction": "",
    "category": "None",
    "stravaDistanceMiles": 14.33,
    "stravaAscentFt": 427
  },
  {
    "fileName": "mostly-out-and-back.gpx",
    "direction": "",
    "category": "Out and back",
    "stravaDistanceMiles": 6.00,
    "stravaAscentFt": 568
  },
  {
    "fileName": "stretched-out-loop.gpx",
    "direction": "clockwise",
    "category": "Circular",
    "stravaDistanceMiles": 11.46,
    "stravaAscentFt": 951
  },
  {
    "fileName": "complex-hybrid.gpx",
    "direction": "",
    "category": "None",
    "stravaDistanceMiles": 6.91,
    "stravaAscentFt": 1214
  },
  {
    "fileName": "loop-with-inner-loop.gpx",
    "direction": "Anti-clockwise",
    "category": "Circular",
    "stravaDistanceMiles": 4.65,
    "stravaAscentFt": 259
  },  
  {
    "fileName": "two-loops.gpx",
    "direction": "Anti-clockwise",
    "category": "Circular",
    "stravaDistanceMiles": 5.80,
    "stravaAscentFt": 256
  },
  {
    "fileName": "Beyond_stunning.gpx",
    "direction": "Anti-clockwise",
    "category": "One-Way",
    "stravaDistanceMiles": 9.40,
    "stravaAscentFt": 1416
  }
];


let route; // not declaring this has caused problems more than once, dont forget it

it('wrapper it to wait for promise.all to complete', function () {

  let testWithData = function (testItem) {

    return function () {

      before( function() {

        this.timeout(30000);

        return gpxToRoute(dir+testItem.fileName)
          .then( function(result) { route = result } )
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
          const distance = route.stats.distance / 1000 * 0.62137;
          return expect(distance).to.satisfy(function(d) { return (d < 1.02*testItem.stravaDistanceMiles) && (d > 0.98*testItem.stravaDistanceMiles)});
        });
      }
      
      if (testItem.stravaAscentFt>0) {
        it('should have ascent within 10% of ' + testItem.stravaAscentFt, function() {
          const ascent = route.stats.elevations.ascent * 3.28084;
          return expect(ascent).to.satisfy(function(a) { return (a < 1.1*testItem.stravaAscentFt) && (a > 0.9*testItem.stravaAscentFt)});
        });
      }

    };
  }; // testWithData


  //  loops through all the provided test cases, using the closure as an argument
  testList.forEach( function(testInfo) {
    describe("Testing file: " + testInfo.fileName , testWithData(testInfo));
  });


}); // it (hack)




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



