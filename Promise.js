const PROMISE_STATUS = {
  PENDING: 'pending',
  FULFILLED: 'fulfilled',
  REJECTED: 'rejected',
};

class MyPromise {
  /**
   * new Promise(executor)
   * @param {Function} executor binding to resolve and reject
   */
  constructor(executor) {
    this.promiseState = PROMISE_STATUS.PENDING;
    this.promiseResult = null;

    // async executor일 경우, onFulfilled callback을 저장할 this
    this.resolveTask = null;
    // async executor일 경우, onRejected callback을 저장할 this
    this.rejectTask = null;

    executor(this.resolve.bind(this), this.reject.bind(this));
  }

  /**
   * Promise.all(iterable)
   * @param {Array<object>} iterable supposed Array<Promise>
   * @returns {(MyPromise<string|error>)}
   */
  static all(iterable) {
    return new MyPromise((resolve, reject) => {
      const results = [];
      let count = 0;

      iterable.forEach((task, index) => {
        this.resolve(task).then(result => {
            // async task가 포함된 경우, iterable의 순서를 보장하여 resolve 처리
            results[index] = result;
            count += 1;
            if (iterable.length === count) {
              resolve(results);
            }
          }).catch(err => {
            // task가 reject될 경우, 해당 task를 리턴하고 iterable 종료
            if (iterable.length !== 0) {
              reject(err);
              iterable = [];
            }
          });
      });
    });
  }

  /**
   * Promise.resolve(value)
   * @param {*} value a resolve value
   * @returns {(MyPromise<string>)}
   */
  static resolve(value) {
    // value가 MyPromise 인스턴스일 경우, 그대로 리턴
    if (value && value.then) {
      return value;
    }

    // MyPromise 인스턴스 생성한 후 state와 value를 담아 리턴
    const promise = new MyPromise(() => {});
    promise.promiseState = PROMISE_STATUS.FULFILLED;
    promise.promiseResult = value;
    return promise;
  };

  /**
   * Promise.reject(reason)
   * @param {*} reason a reject reason
   * @returns {(MyPromise<error>)}
   */
  static reject(reason) {
    // reason이 MyPromise 인스턴스일 경우, 그대로 리턴
    if (reason && reason.catch) {
      return reason;
    }

    // MyPromise 인스턴스 생성한 후 state와 reason을 담아 리턴
    const promise = new MyPromise(() => {});
    promise.promiseState = PROMISE_STATUS.REJECTED;
    promise.promiseResult = reason;
    return promise;
  };

  /**
   * this.resolve
   * @param {*} value a resolve value
   */
  resolve(value) {
    this.promiseState = PROMISE_STATUS.FULFILLED;
    this.promiseResult = value;

    // async callback으로 저장된 resolveTask가 있다면 실행
    if (this.resolveTask) {
      this.resolveTask();
    }
  };

  /**
   * this.reject
   * @param {*} reason a reject reason
   */
  reject(reason) {
    this.promiseState = PROMISE_STATUS.REJECTED;
    this.promiseResult = reason;

    // async callback으로 저장된 rejectTask가 있다면 실행
    if (this.rejectTask) {
      this.rejectTask();
    }
  };

  /**
   * To check callback result is MyPromise or not
   * @param {Function} callback onFulfilled or onRejected
   * @param {Function} resolve this.resolve
   * @param {Function} reject this.reject
   * @returns {(MyPromise<string|error>)|undefined}
   * return MyPromise when the result is a MyPromise
   * return undefined when the result is not a MyPromise
   */
  _checkCallbackResult(callback, resolve, reject) {
    const result = callback(this.promiseResult);

    // result가 MyPromise라면 then 호출하여 return 값 반환
    return result && result.then
      ? result.then(resolve, reject)
      : resolve(result);
  }

  /**
   * Promise.prototype.then(func)
   * @param {Function} onFulfilled
   * @param {Function} onRejected
   * @returns {(MyPromise<string|error>)}
   */
  then(onFulfilled, onRejected) {
    switch (this.promiseState) {
      // executor 함수가 async일 경우,
      case PROMISE_STATUS.PENDING: {
        return new MyPromise((resolve, reject) => {
          // onFulfilled callback을 this에 저장
          this.resolveTask = () => this._checkCallbackResult(onFulfilled, resolve, reject);
          onRejected
            // onRejected 값이 있다면 callback을 this에 저장
            ? this.rejectTask = () => this._checkCallbackResult(onRejected, resolve, reject)
            // 없다면 async executor 처리 후 reject 발생 시의
            // catch문 실행을 위해 promiseResult 전달
            : this.rejectTask = () => reject(this.promiseResult);
        })
      }
      // executor 함수가 resolve된 경우,
      case PROMISE_STATUS.FULFILLED: {
        return new MyPromise((resolve, reject) => {
          // onFulfilled callback 실행하여 resolve 처리
          this._checkCallbackResult(onFulfilled, resolve, reject);
        })
      }
      // executor 함수가 reject된 경우,
      case PROMISE_STATUS.REJECTED: {
        return onRejected
          // onRejected 값이 있다면 callback 실행하여 resolve 처리
          ? new MyPromise((resolve, reject) => {
            this._checkCallbackResult(onRejected, resolve, reject)
          })
          : this;
      }
    }
  }

  /**
   * Promise.prototype.catch(func)
   * @param {Function} onRejected
   * @returns {(MyPromise<error>)}
   */
  catch(onRejected) {
    switch (this.promiseState) {
      // executor 함수가 async일 경우,
      case PROMISE_STATUS.PENDING: {
        return new MyPromise((resolve, reject) => {
          // onRejected callback을 this에 저장
          this.rejectTask = () => this._checkCallbackResult(onRejected, resolve, reject);
        })
      }
      // executor 함수가 resolve된 경우,
      case PROMISE_STATUS.FULFILLED: {
        return this;
      }
      // executor 함수가 reject된 경우,
      case PROMISE_STATUS.REJECTED: {
        return new MyPromise((resolve, reject) => {
          // onRejected callback 실행하여 resolve 처리
          this._checkCallbackResult(onRejected, resolve, reject)
        });
      }
    }
  }

  /**
   * Promise.prototype.finally(func)
   * @param {Function} onFinally
   * @returns {(MyPromise<string>)}
   */
  finally(onFinally) {
    switch (this.promiseState) {
      // executor 함수가 async일 경우,
      case PROMISE_STATUS.PENDING: {
        return new MyPromise((resolve, reject) => {
          // onRejected callback을 this에 저장
          this.resolveTask = () => resolve(onFinally());
          // this.rejectTask = () => reject(onFinally());
        });
      }
      // executor 함수가 resolve 혹은 reject된 경우,
      default: {
        // onFinally callback 실행하여 resolve 처리
        return new MyPromise(resolve => resolve(onFinally()));
      }
    }
  }
}

export default MyPromise;
