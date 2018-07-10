export const callCC = f =>
  new Cont(k => f(a => new Cont(_ => k(a))).run(k));

export class Cont {
  
  constructor(cb) {
    this.cb = cb;
  }
  
  static of(val) {
    return new Cont(k => k(val));
  }
  
  chain(f) {
    if (typeof f !== 'function') {
      throw new Error('argument to chain should be a function')
    }
    return new Cont(k => {
      this.cb(val => {
        let next = f(val);
        if (!(next instanceof Cont)) {
          throw new Error("expected return value of chain's argument to be of type Cont");
        }
        return next.cb(k);
      });
    });
  }

  run(f) {
    return this.cb(f);
  }
}

export const pure = Cont.of;

