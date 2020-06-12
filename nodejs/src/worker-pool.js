
"use strict"

/**
 * Manages the thread pool, allowing new tasks to be added. See important implementation notes below
 * threads library https://threads.js.org/, https://github.com/andywer/threads.js/
 * 
 * Creating the thread pool
 * The construction of the thread pool must be done very carefully.  Each time a pool is created
 * the worker functions are serialised and sent to each of the eight threads.  The worker functions
 * require back to this module because we need to make the pool instance available in order to add 
 * tasks, so if the pool is instantiated carelessly we get an infinite loop as each of the threads 
 * a new pool of eight threads and so forth.
 * 
 * Use of class instances in thread pool
 * When a task is send to a worker, it loses the methods on the class, so its important
 * that all the methods are called early and populate as many of the desired properties
 * as possible.
 */

const spawn = require('threads/dist').spawn;
const Worker = require('threads/dist').Worker;
const Pool = require('threads/dist').Pool;
const os = require('os');



class ThreadPool{

  constructor(){
    this.theOneAndOnlyPool = null;
    this.poolSize = os.cpus().length;
  }

  create() {
    if (!this.theOneAndOnlyPool) {
      this.theOneAndOnlyPool = Pool(() => spawn(new Worker('./worker-tasks.js')), this.poolSize);
    } else {
      throw new Error("Only one pool can exist at any time");
    }
  }

  /**
   * Add a task to the thread pool 
   * Takes any number of arguments, the first must be the name of the function to call as a string,
   * which must also be defined as a worker task in 'worker-tasks'.  The remining arguments are
   * the arguments required by the called function
   */
  addTaskToQueue() {

    const args = [...arguments];
    const functionName = args[0];
    const functionArguments = args.length > 2 ? args.slice(1) : [args[1]];

    return new Promise((resolve, reject) => {
      this.theOneAndOnlyPool.queue(async workerFunctions => {
        try {

          const result = await workerFunctions[functionName](...functionArguments);
          resolve(result);

        } catch (error) {

          reject(error)

        }
      })
    })
  }

}



module.exports = {
  threadPool: new ThreadPool()
}
