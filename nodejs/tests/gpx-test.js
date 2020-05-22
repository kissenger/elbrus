"use strict"

/**
 * A relatively mature set of test for gpxRead
 * TODO: tests for gpxWrite
 */

import chai from 'chai';
import chaiAsPromised from "chai-as-promised";
var expect = chai.expect;
var reject = chai.reject;
chai.use(chaiAsPromised);

import { readFile } from 'fs';
import { gpxRead } from '../gpx.js';

const dir = './data/';

const tests = [
  {
    fileName: 'short-near-loop.gpx',
    expectedName: 'Afternoon Run',
    expectedLength: 8136,
    firstPoint: {
      lngLat: [-2.2578650, 51.3456770],
      elev: 45.6,
      time: '2020-02-22T15:48:42Z'
    },
    lastPoint: {
      lngLat: [-2.2569340, 51.3440950],
      elev: 30.4,
      time: '2020-02-22T18:04:17Z'
    },
    isTime: true,
    isElev: true,
  },
  {
    fileName: 'mendip_way.gpx',
    expectedName: 'Mendip Way',
    expectedLength: 529,
    firstPoint: {
      lngLat: [-2.985185, 51.321488],
      elev: null,
      time: false
    },
    lastPoint: {
      lngLat: [-2.321761, 51.231002],
      elev: 70,
      time: false
    },
    isTime: false,
    isElev: true,
  }
];

// const testItem = tests[0];
let gpxResult;

it('wrapper it to wait for promise.all to complete', function () {

  let testWithData = function (testItem) {
    // this is a closure to define the actual tests - needed to cope with a loop of tests each with promises

    return function () {

      // Do this on each loop before running the tests
      before( function() {
        this.timeout(30000);
        return loadFile(dir+testItem.fileName)
          .then( function(buffer) {
            gpxResult = readGPX(buffer.toString() );
            console.log(gpxResult.lngLat.length, gpxResult)
          })
          .catch( function(error) {
            console.log(error);
          })
      });


      it('should return an instance of Object', function() {
        expect(gpxResult).to.satisfy(function(r) { return r instanceof Object});
      });

      it('should have properties name, time, elev and lngLat', function() {
        expect(Object.keys(gpxResult)).to.deep.equal(['name', 'lngLat', 'elev', 'time']);
      });

      it('name is as expected', function() {
        expect(gpxResult.name).to.equal(testItem.expectedName);
      });


      it('lngLats to have correct length', function() {
        expect(gpxResult.lngLat.length).to.equal(testItem.expectedLength);
      });

      it('time to be present and of correct length, if expected', function() {
        if (testItem.isTime) {
          expect(gpxResult.time.length).to.be.greaterThan(0);
          expect(gpxResult.time.length).to.equal(testItem.expectedLength);
        } else {
          expect(gpxResult.time).to.equal(null);
        }
      });

      it('elev to be present and of correct length, if expected', function() {
        if (testItem.isElev) {
          expect(gpxResult.elev.length).to.be.greaterThan(0);
          expect(gpxResult.elev.length).to.equal(testItem.expectedLength);
        } else {
          expect(gpxResult.elev).to.equal(null);
        }
      });

      it('first lngLat is as expected', function() {
        expect(gpxResult.lngLat[0]).to.deep.equal(testItem.firstPoint.lngLat);
      });

      it('first elev is as expected', function() {
        if (testItem.firstPoint.elev) {
          expect(gpxResult.elev[0]).to.equal(testItem.firstPoint.elev);
        }
      });

      it('first time is as expected', function() {
        if (testItem.firstPoint.time) {
          expect(gpxResult.time[0]).to.equal(testItem.firstPoint.time);
        }
      });

      it('last lngLat is as expected', function() {
        expect(gpxResult.lngLat[testItem.expectedLength-1]).to.deep.equal(testItem.lastPoint.lngLat);
      });

      it('last elev is as expected', function() {
        if (testItem.firstPoint.elev) {
          expect(gpxResult.elev[testItem.expectedLength-1]).to.equal(testItem.lastPoint.elev);
        }

      });

      it('last time is as expected', function() {
        if (testItem.firstPoint.time) {
          expect(gpxResult.time[testItem.expectedLength-1]).to.equal(testItem.lastPoint.time);
        }

      });

    };
  };

  /**
   * Loop through all the defined tests, calling testWithData on each
   */
  tests.forEach( function(test) {
    describe(`Correctly reading in ${test.fileName}`, testWithData(test));
  });

}) // it (hack)



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
