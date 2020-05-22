
/**
 * This test imports test route, creates a Path object and compares the calculated
 * path properties against our expectations
 */

import chai from 'chai';
import chaiAsPromised from "chai-as-promised";
var expect = chai.expect;
var reject = chai.reject;
chai.use(chaiAsPromised);

import { Route } from '../class-path.js';
import { readFile } from 'fs';
import { getRouteInstance } from '../app.js';
// console.log(app)
// var getRouteInstance = app.getRouteInstance;


const testList = [
  {
    "filename": "mendip-way",
    "direction": "West to East",
    "category": "One way"
  },
  {
    "filename": "short-circular",
    "direction": "Anti-Clockwise",
    "category": "Circular"
  },
  {
    "filename": "short-near-loop",
    "direction": "Clockwise",
    "category": "Circular"
  },
  {
    "filename": "short-out-and-back-complex",
    "direction": "",
    "category": "Out and back"
  },
  {
    "filename": "very-out-and-back",
    "direction": "",
    "category": "Out and back"
  }
];





// it('shoud equal 1', function () { // a hack to get the 'before' to deliver promisified data


  // this is a closure to define the actual tests - needed to cope with a loop of tests each with promises
  let testWithData = function (test) {

    return function () {

      it('should have category ' + test.category, function() {
        // this.timeout(30000);
        return expect(getPath('./data/'+test.filename+'.js')).to.eventually.deep.equal({category: test.category, direction: test.direction})
      });

    };
  }; // testWithData


  //  loops through all the provided test cases, using the closure as an argument
  testList.forEach( function(testInfo) {
    describe("Testing file: " + testInfo.filename , testWithData(testInfo));
  });


// }); // it (hack)


/**
 * Imports the requested data file and runs the standard workflow to instantiate a
 * Path, returning the Path instance as a promise
 */
function getPath(fn) {
  return new Promise ( (res, rej) => {

    readFile(fn, (err, data) => {

      const testObject = JSON.parse(data);
      getRouteInstance(testObject.name, null, testObject.lngLat, [])
        .then( route => {
          const mongoObj = route.asMongoObject();
          res({category: mongoObj.info.category, direction: mongoObj.info.direction}) })
        .catch( error => rej(error));
      });

  });
}




