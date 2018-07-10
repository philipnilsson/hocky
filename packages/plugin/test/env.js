import { Cont, pure, callCC } from './cont';

const env = {
  pure,
  callCC,
  mutable_var: 'mutable:',
  mutable_int: 0,
  wrap: x => {
    log.push({ wrap: x });
    return { wrap: x };
  },
  truthy: () => {
    log.push('truthy');
    return new Cont(k => setTimeout(() => k(true), 0))
  },
  falsy: () => {
    log.push('falsy');
    return new Cont(k => setTimeout(() => k(false), 0))
  },
  foo: new Cont(k => {
    log.push('foo-outer');
    return k(new Cont(k => {
      log.push('foo-inner');      
      k('foo');
    }));
  }),
  fooo: new Cont(k => {
    return k(env.foo);
  }),
  bar: x => {
    log.push({ bar: x });
    return { bar: x };
  },
  baz: x => {
    log.push({ baz: x });
    return new Cont(k => {
      log.push({ request: { baz: x } });
      setTimeout(() => {
        log.push({ resolve: { baz: x } });        
        k({ baz: x });
      }, 0);
    });
  },
  mfun: new Cont(k => {
    log.push('mfun_await');
    setTimeout(() => k((x, y) => {
      log.push({ mfun_call: { x, y } });
      return { x, y };
    }));
  }),
  quux: x => {
    log.push({ quux: x });
    return new Cont(k => setTimeout(() => k({ quux: x }), 0))
  },
  console: {
    log: (...args) => {
      log.push({ console: { log: args } });
    }
  }
};

export let log = [];
beforeEach(() => {
  log.splice(0);
});

export default env;
