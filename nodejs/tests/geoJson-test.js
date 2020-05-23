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
import { GeoJSON } from '../class-geojson.js';

const dir = './mongo-data/';

const tests = [
  {
    fileName: 'boa-wheel-mongo-doc.txt',
    expectedNumberOfFeatures: 27 // nHills = 13, none are at the start or end so nFeatures = 13*2+1
  }
];

// const testItem = tests[0];
let mongoDocument;
let geoJson;
let nHills;
let nPointsOnPath;
let doesStartOnHill;
let doesEndOnHill;

it('wrapper it to wait for promise.all to complete', function () {

  let testWithData = function (testItem) {
    // this is a closure to define the actual tests - needed to cope with a loop of tests each with promises

    return function () {

      // Do this on each loop before running the tests
      before( function() {
        this.timeout(30000);
        return loadFile(dir+testItem.fileName)
          .then( function(buffer) {
            mongoDocument = JSON.parse(buffer);
            geoJson = new GeoJSON().fromDocument(mongoDocument).toGeoHills();

            nHills = geoJson.properties.stats.hills.length;
            nPointsOnPath = mongoDocument.geometry.coordinates.length;
            doesStartOnHill = geoJson.properties.stats.hills[0].startPoint === 0;
            doesEndOnHill = geoJson.properties.stats.hills[nHills-1].EndPoint === nPointsOnPath;

          })
          .catch( function(error) {
            console.log(error);
          })
      });


      it('should have type: \'FeatureCollection\'', function() {
        expect(geoJson.type).to.equal('FeatureCollection');
      });

      it('should have expected number of features', function() {
        let expectedNumberOfFeatures
        if (doesStartOnHill && doesEndOnHill) {
          expectedNumberOfFeatures = nHills * 2 - 1;
        } else if ( doesStartOnHill || doesEndOnHill ) {
          expectedNumberOfFeatures = nHills * 2;
        } else {
          expectedNumberOfFeatures = nHills * 2 + 1
        }
        expect(geoJson.features.length).to.equal(expectedNumberOfFeatures);
      });


      it('first point on first feature should equal first lnglat in mongodocument', function() {
        expect(geoJson.features[0].geometry.coordinates[0]).to.deep.equal(mongoDocument.geometry.coordinates[0]);
      });


      it('last point on last feature should equal last lnglat in mongodocument', function() {
        const geoJsonLastFeature =  geoJson.features[geoJson.features.length-1];
        const geoJsonLastPoint =  geoJsonLastFeature.geometry.coordinates[geoJsonLastFeature.geometry.coordinates.length-1];
        const mongoLastPoint = mongoDocument.geometry.coordinates[mongoDocument.geometry.coordinates.length-1];
        expect(geoJsonLastPoint).to.deep.equal(mongoLastPoint);
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
