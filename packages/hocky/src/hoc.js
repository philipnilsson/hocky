import React from 'react';

export default class HOC {
  constructor(run) {
    this._run = run;
  }
  
  run(f = x => x) {
    return this._run(f);
  }
  
  chain(f) {
    return new HOC(consumer => {
      return this.run(val => f(val).run(consumer))
    });
  }
}
