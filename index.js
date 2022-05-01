import MyPromise from './Promise.js';

const p1 = MyPromise.resolve(3);
const p2 = 1337;
const p3 = new MyPromise((resolve, reject) => {
  setTimeout(() => {
    resolve('foo');
  }, 100);
});

MyPromise.all([p1, p2, p3])
  .then(res => {
    console.log(res); // [3, 1337, 'foo']
  })
  .catch(err => {
    console.error(err);
  });

new MyPromise((resolve, reject) => {
  setTimeout(() => {
    resolve('First Promise Success');
    // reject('First Promise Fail');
  }, 1000);
})
  .then(res => {
    console.log(res);
    return 'Second Promise';
  }, err => {
    console.error(err);
    return 'Second Promise';
  })
  .then(res => {
    console.log(res);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve('Third Promise');
      }, 1000);
    });
  })
  .then(res => {
    console.log(res);
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        reject('Fourth Promise');
      }, 1000);
    });
  })
  .then(res => {
    console.log(res);
  })
  .then(res => {
    console.log(res);
    throw new Error('This error will be printed in catch.');
  })
  .then(res => {
    console.log('Not printed');
  })
  .catch(err => {
    console.error(err);
  })
  .finally(() => {
    console.log('It is printed always.');
  });
