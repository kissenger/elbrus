// require('dotenv').config();
// const readFile = require('fs').readFile;
// const gpxRead = require('../src/gpx-read-write').gpxRead;
// const getRouteInstance = require('../src/app-functions.js').getRouteInstance;

// const spawn = require('threads').spawn;
// const Thread = require('threads').Thread;
// const Worker = require('threads').Worker;
// const Pool = require('threads').Pool;


import 'dotenv/config.js';
import { readFile } from 'fs';
import { gpxRead } from '../src/gpx-read-write.js';
import { getRouteInstance } from '../src/app-functions.js';

// import { spawn, Threads, Worker } from "threads";
// import * as threads from 'threads';
import threads from 'threads';
const Worker = threads.Worker;
const Pool = threads.Pool;
const spawn = threads.spawn;
// const {Point, Path, geoFunctions} = geolib;

// import { spawn, Thread, Worker } from "threads";
// import * as threads from 'threads';
// import threads from 'threads';
// const Worker = threads.Worker;
// const {Point, Path, geoFunctions} = geolib;

// console.log(threads.Worker);

const dir = './tests/data/';
const fn ='south west coast path.gpx';
const NUMBER_OF_TESTS = 4;

// const pool = workerpool.pool();
// const pool = workerpool.pool('./src/gpx-read-write.js');

(async () => {

  console.log('preflight...');
  const fileBuffer = await loadFile(dir+fn);
  const buffString = fileBuffer.toString();
  const pathFromGPX123 = gpxRead(buffString);
  console.log('data loaded...');


  /**
   * Without threads
   */
  let startTime = new Date();

  // for (let i = 0; i < NUMBER_OF_TESTS; i++) {

  //   if (i%2===0) {
  //     const pathFromGPX = gpxRead(buffString);
  //     const routeInstance = await getRouteInstance(pathFromGPX.name, null, pathFromGPX.lngLat, pathFromGPX.elev);
  //     console.log(routeInstance.asMongoObject('1234', 'kiss', false));
  //   } else {
  //     const routeInstance = await getRouteInstance(pathFromGPX123.name, pathFromGPX123.description, pathFromGPX123.lngLat, pathFromGPX123.elev);
  //     console.log(routeInstance.asMongoObject('1234', 'kiss', false));
  //   }

  // }

  // console.log(`Ran ${NUMBER_OF_TESTS} tests without threads in ${timeDiff(new Date() - startTime)}`) 
  


  /**
   * With threads
   */
  startTime = new Date();
  const pool = Pool(() => spawn(new Worker('workers.js')), 8 /* optional size */);
  let prom;

  for (let i = 0; i < NUMBER_OF_TESTS; i++) {

    if (i%2===0) {

      prom = new Promise((resolve, reject) => {
        pool.queue(async workerFunctions => {
          try {
            const result = await workerFunctions.gpxToMongo(buffString);
            result.asMongoObject('1234', 'kiss', false);
            resolve(result);
          } catch (error) {
            reject(error)
          }
        })
      })

    } else {

      prom = new Promise((resolve, reject) => {
        pool.queue(async workerFunctions => {
          try {
            const result = await workerFunctions.lngLatToMongo(pathFromGPX123);
            
            resolve(result);
          } catch (error) {
            reject(error)
          }
        })
      })

    }



    prom.then(result => console.log(result));

  }

  
  await pool.completed();
  await pool.terminate()
  console.log(`Ran ${NUMBER_OF_TESTS} tests with threads in ${timeDiff(new Date() - startTime)}`) 


  

// end of async IIFE
})().catch(err => {
  console.error(err);
});








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