"use strict"

console.log('fingers');

// const spawn = require('threads').spawn;
// const Thread = require('threads').Thread;
// const Worker = require('threads').Worker;
// const Pool = require('threads').Pool;
// // const pool = Pool(() => spawn(new Worker('./thread-workers.js')), 8);
// console.log('breasts');
// // console.log(pool);


// let worker;
// let myPool;
// console.log(!!worker)
// if (!myPool) {
//   console.log('blah')
//   worker = new Worker('./thread-workers.js')
//   myPool = Pool(() => spawn(worker), 8);
// }

/**
 * Instantiate a thread pool
 * TODO: make sure this only runs once...
 */
// function initThreadPool() {
//   return Pool(() => spawn(new Worker('./thread-workers.js')), 8);
//   console.log('pool')
// // }

// let tsThreadPool;
// if (!!tsThreadPool) {
//   console.log('yes')
  
// } else {
//   console.log('no', tsThreadPool)
//   tsThreadPool = 'hello'
//   console.log('no', tsThreadPool)
// }

// function createThreadPool() {
//   return Pool(() => spawn(new Worker('./thread-workers.js')), 8);
//   createThreadPool = function(){}; // kill it as soon as it was called
// }





// class ThreadPool {

//   constructor() {
//     this.pool = Pool(() => spawn(new Worker('./thread-workers.js')), 8);
//     console.log('create pool');
//   }
  
//   addTaskToQueue(functionName, argument) {

//     return new Promise((resolve, reject) => {
//       this.pool.queue(async workerFunctions => {
//         try {

//           const result = await workerFunctions[functionName](argument);
//           resolve(result);

//         } catch (error) {

//           reject(error)

//         }
//       })
//     })
//   }
// }

// let pool;
// if (!pool) {
//   pool = Pool(() => spawn(new Worker('./thread-workers.js')), 8);
//   console.log('pool')
// }

/**
 * Helper function to deliver a task into the thread queue
 */



// module.exports = {
//   addTaskToQueue,
//   createThreadPool
// }