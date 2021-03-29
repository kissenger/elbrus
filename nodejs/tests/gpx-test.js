"use strict"

/**
 * A relatively mature set of test for gpxRead
 * TODO: tests for gpxWrite
 */

const chai = require('chai');
var expect = chai.expect;
var reject = chai.reject;;
require('dotenv').config();
const readFile = require('fs').readFile;
const { DOMParser } = require('xmldom');
const ParseGPX = require('../src/gpx').ParseGPX;
// const gpxRead = require('../src/gpx').gpxRead;

const dir = './tests/data/';

const tests = [
  {
    fileName: 'short-near-loop.gpx',
    expectedName: 'Afternoon Run',
    expectedDescription: null,
    expectedLength: 8136,
    firstPoint: {
      lngLats: [-2.2578650, 51.3456770],
      elevs: 45.6,
      time: '2020-02-22T15:48:42Z'
    },
    lastPoint: {
      lngLats: [-2.2569340, 51.3440950],
      elevs: 30.4,
      time: '2020-02-22T18:04:17Z'
    },
    isTime: true,
    isElev: true,
  },
  {
    fileName: 'mendip_way.gpx',
    expectedName: 'Mendip Way',
    expectedDescription: null,
    expectedLength: 529,
    firstPoint: {
      lngLats: [-2.985185, 51.321488],
      elevs: null,
      time: false
    },
    lastPoint: {
      lngLats: [-2.321761, 51.231002],
      elevs: 70,
      time: false
    },
    isTime: false,
    isElev: true,
  },
  {
    fileName: 'North-Downs-Way-SWC-Walk-L5.gpx',
    expectedName: 'Stage 1 Farnham to Near Guildford Station',
    expectedDescription: null,
    expectedLength: 104,
    firstPoint: {
      lngLats: [-0.792785, 51.212036],
      elevs: 73,
      time: false
    },
    lastPoint: {
      lngLats: [-0.577476, 51.225416],
      elevs: 39,
      time: false
    },
    isTime: false,
    isElev: true,
  },
  {
    fileName: 'Deverills bikepacking route.gpx',
    expectedName: 'Deverills bikepacking route',
    expectedDescription: 'Route contributed by Laurence McJannet, author of Bikepacking: Mountain Bike Camping Adventures on the Wild Trails of Britain (http://www.wildthingspublishing.com/)\n' + 
    '\n' +
    'For more bikepacking route inspiration, check out http://win.gs/ukbikepackingroutes',
    expectedLength: 645,
    firstPoint: {
      lngLats: [-2.07875, 51.06145],
      elevs: 91.4,
      time: false
    },
    lastPoint: {
      lngLats: [-2.27279, 51.17329],
      elevs: 169.8,
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
            // gpxResult = gpxRead(buffer.toString() );
            gpxResult = new ParseGPX(buffer.toString(), DOMParser);
            console.log(gpxResult)
            // console.log(gpxResult.lngLats.length, gpxResult)
          })
          .catch( function(error) {
            console.log(error);
          })
      });


      it('should return an instance of Object', function() {
        expect(gpxResult).to.satisfy(function(r) { return r instanceof Object});
      });

      it('should have properties name, description, time, elevs and lngLats', function() {
        expect(Object.keys(gpxResult)).to.deep.equal(['name', 'description', 'lngLats', 'elevs', 'time']);
      });

      it('name is as expected', function() {
        expect(gpxResult.name).to.equal(testItem.expectedName);
      });

      it('description is as expected', function() {
        expect(gpxResult.description).to.equal(testItem.expectedDescription);
      });

      it('lngLats to have correct length', function() {
        expect(gpxResult.lngLats.length).to.equal(testItem.expectedLength);
      });

      it('time to be present and of correct length, if expected', function() {
        if (testItem.isTime) {
          expect(gpxResult.time.length).to.be.greaterThan(0);
          expect(gpxResult.time.length).to.equal(testItem.expectedLength);
        } else {
          expect(gpxResult.time).to.equal(null);
        }
      });

      it('elevs to be present and of correct length, if expected', function() {
        if (testItem.isElev) {
          expect(gpxResult.elevs.length).to.be.greaterThan(0);
          expect(gpxResult.elevs.length).to.equal(testItem.expectedLength);
        } else {
          expect(gpxResult.elevs).to.equal(null);
        }
      });

      it('first lngLats is as expected', function() {
        expect(gpxResult.lngLats[0]).to.deep.equal(testItem.firstPoint.lngLats);
      });

      it('first elevs is as expected', function() {
        if (testItem.firstPoint.elevs) {
          expect(gpxResult.elevs[0]).to.equal(testItem.firstPoint.elevs);
        }
      });

      it('first time is as expected', function() {
        if (testItem.firstPoint.time) {
          expect(gpxResult.time[0]).to.equal(testItem.firstPoint.time);
        }
      });

      it('last lngLats is as expected', function() {
        expect(gpxResult.lngLats[testItem.expectedLength-1]).to.deep.equal(testItem.lastPoint.lngLats);
      });

      it('last elevs is as expected', function() {
        if (testItem.firstPoint.elevs) {
          expect(gpxResult.elevs[testItem.expectedLength-1]).to.equal(testItem.lastPoint.elevs);
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
