console.log('thumbs')

const spawn = require('threads').spawn;
const Thread = require('threads').Thread;
const Worker = require('threads').Worker;
const Pool = require('threads').Pool;
const myPool = Pool(() => spawn(new Worker('./thread-workers.js')), 8);
// console.log('breasts');
// // console.log(pool);


// let worker;
// let myPool;
// console.log(!!worker)
// if (!myPool) {
//   console.log('blah')
//   worker = new Worker('./thread-workers.js')
//   myPool = Pool(() => spawn(worker), 8);
//   console.log(!!worker)
// }


function addTaskToQueue(functionName, argument) {

  return new Promise((resolve, reject) => {
    myPool.queue(async workerFunctions => {
      try {

        const result = await workerFunctions[functionName](argument);
        resolve(result);

      } catch (error) {

        reject(error)

      }
    })
  })
}

module.exports = {
  myPool,
  addTaskToQueue
}
