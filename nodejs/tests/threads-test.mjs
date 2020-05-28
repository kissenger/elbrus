
import 'dotenv/config.js';
import { readFile } from 'fs';
// import { gpxRead } from '../src/gpx-read-write.js';


// import { spawn, Thread, Worker } from "threads";
// import * as threads from 'threads';
import threads from 'threads';
const Worker = threads.Worker;
// const {Point, Path, geoFunctions} = geolib;

// console.log(threads.Worker);

const dir = './tests/data/';
const fn ='south west coast path.gpx';
const NUMBER_OF_TESTS = 1;

// const pool = workerpool.pool();
// const pool = workerpool.pool('./src/gpx-read-write.js');

(async () => {

  const fileBuffer = await loadFile(dir+fn);
  const startTime = new Date();
  const promises = [];
  console.log('data loaded');
  
  for (let i = 0; i < NUMBER_OF_TESTS; i++) {


    // async function main() {
      // console.log(threads.spawn)
      const worker = new Worker('gpx-worker.mjs');
      const gpxRead = await threads.spawn(worker);
      const result = await gpxRead(fileBuffer)
    
      console.log(result)
    
      await threads.Thread.terminate(gpxRead);
    // }
    
    // main().catch(console.error)

    // promises.push(pool.exec('gpxRead', [fileBuffer.toString()]))
    // promises.push(getGPX(fileBuffer.toString()))

    // const result = await pool.exec('gpxRead', [fileBuffer.toString()]);
    // const result = await getGPX(fileBuffer.toString());
    // console.log(result);

  }

  // Promise.all(promises).then( (r) => {
  //   console.log(r.slice(0,100))
  //   // pool.terminate();
  //   console.log(`Ran ${NUMBER_OF_TESTS} tests in ${timeDiff(new Date() - startTime)}`) 
  // });


  function getGPX(fb) {
    return new Promise( async (res, rej) => { 
      const result = await gpxRead(fb);
      res(result)
    })
  }



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

