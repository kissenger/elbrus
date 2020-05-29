"use strict"

const spawn = require('threads').spawn;
const Thread = require('threads').Thread;
const Worker = require('threads').Worker;
const Pool = require('threads').Pool;


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

class ThreadPool {

  constructor() {
    this.pool = Pool(() => spawn(new Worker('./thread-workers.js')), 8);
    console.log('create pool');
  }
  
  addTaskToQueue(functionName, argument) {

    return new Promise((resolve, reject) => {
      this.pool.queue(async workerFunctions => {
        try {

          const result = await workerFunctions[functionName](argument);
          resolve(result);

        } catch (error) {

          reject(error)

        }
      })
    })
  }
}

// let pool;
// if (!pool) {
//   pool = Pool(() => spawn(new Worker('./thread-workers.js')), 8);
//   console.log('pool')
// }

/**
 * Helper function to deliver a task into the thread queue
 */



module.exports = {
  // addTaskToQueue,
  ThreadPool
}