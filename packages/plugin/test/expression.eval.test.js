import compile from '../compiler';
import gen from '@babel/generator';
import { transformSync } from '@babel/core';
import env, { log } from './env';
import { debug } from '../util';

const plugins = [
  {
    visitor: {
      FunctionExpression(path) {
        if (path.node.generator) {
          const [ node, subs ] = compile(path.scope)(path.node);
          if (subs.length) {
            throw new Error('unhandled substitutions');
          }
          path.replaceWith(node);
          path.node.generator = false;
        }
      }
    }
  },
  'babel-plugin-transform-do-expressions'
];

function evalExpression(expr, opts = {}) {
  const { ast } = transformSync(`(function* () { return ${expr} })`, { plugins, ast: true });
  const exp = ast.program.body[0].expression;
  const { hackyInts = false } = opts;
  const extras = hackyInts
    ? 'Number.prototype.chain = function(f) { return pure(this).chain(f) }'
    : '';
  /* eslint-disable no-new-func */
  console.log(gen(exp).code);
    return new Function(...Object.keys(env), `
    ${extras};
    return ${gen(exp).code}()
  `)(
    ...Object.values(env)
  );
}

describe('evalutation tests', () => {
  it('single effect', done => {
    const exp = 'bar(1)';
    evalExpression(exp).run(val => {
      expect(val).toEqual({ bar: 1 });
      expect(log).toEqual([ { bar: 1 } ]);
      done()
    });
  });
  
  it('two effects', done => {
    const exp = '[bar(1), bar(2)]';
    evalExpression(exp).run(val => {
      expect(val).toEqual([ { bar: 1 }, { bar: 2 } ]);
      expect(log).toEqual([ { bar: 1 }, { bar: 2 } ]);
      done()
    });
  });
  
  it('nested effect', done => {
    const exp = 'wrap(bar(1))';
    evalExpression(exp).run(val => {
      expect(val).toEqual({ wrap: { bar: 1 } });
      expect(log).toEqual([ { bar: 1 }, { wrap: { bar: 1 } } ]);
      done()
    });
  });
  
  it('single yield', done => {
    const exp = 'yield baz(0)';
    evalExpression(exp).run(val => {
      expect(val).toEqual({ baz: 0 });
      expect(log).toEqual([
        { baz: 0 },
        { request: { baz: 0} },
        { resolve: { baz: 0} }
      ]);
      done()
    });
  });
  
  it('nested yield', done => {
    const exp = 'yield yield foo';
    evalExpression(exp).run(val => {
      expect(val).toEqual('foo');
      done();
    });
  });
  
  it('very nested yield', done => {
    const exp = 'yield yield yield fooo';
    evalExpression(exp).run(val => {
      expect(val).toEqual('foo');
      done();
    });
  });
  
  it('assignment effects', done => {
    const exp = 'bar(mutable_var += yield yield foo)';
    evalExpression(exp).run(val => {
      expect(val).toEqual({ bar: 'mutable:foo' });
      expect(log).toEqual([
        'foo-outer',
        'foo-inner',
        { bar: 'mutable:foo' }
      ]);
      done();
    });
  });
  
  it('assignment effects 2', done => {
    const exp = 'bar(mutable_var += "!!" + (yield yield foo))';
    evalExpression(exp).run(val => {
      expect(val).toEqual({ bar: 'mutable:!!foo' });
      expect(log).toEqual([
        'foo-outer',
        'foo-inner',
        { bar: 'mutable:!!foo' }
      ]);
      done();
    });
  });
  
  it('yields with inner effects', done => {
    const exp = 'yield baz(bar(10))';
    evalExpression(exp).run(val => {
      expect(val).toEqual({ baz: { bar: 10 } });
      expect(log).toEqual([
        { bar: 10 },
        { baz: { bar: 10 }},
        { request: { baz: { bar: 10 } } },
        { resolve: { baz: { bar: 10 } } }
      ]);
      done();
    });
  });

  it('yield and effects ordering', done => {
    const exp = 'bar(yield baz(bar(yield yield foo)))';
    evalExpression(exp).run(val => {
      expect(val).toEqual({ bar: { baz: { bar: 'foo' } } });
      expect(log).toEqual([
        'foo-outer',
        'foo-inner',
        { bar: 'foo' },
        { baz: { bar: 'foo' } },
        { request: { baz: { bar: 'foo' } } },
        { resolve: { baz: { bar: 'foo' } } },
        { bar: { baz: { bar: 'foo' } } }
      ]);
      done();
    })
  });
  
  it('yield in callee', done => {
    const exp = '(yield mfun)(yield yield foo, yield baz(1))';
    evalExpression(exp).run(val => {
      expect(val).toEqual({ x: 'foo', y: { baz: 1 } });
      expect(log).toEqual([
        'mfun_await',
        'foo-outer',
        'foo-inner',
        {'baz': 1},
        {'request': {'baz': 1}}
        , {'resolve': {'baz': 1}}
        , {mfun_call: {'x': 'foo', 'y': {'baz': 1}}}
      ]);
      done();
    })
  });
  
  // Conditionals
  it('conditional expression - yield in consequent', done => {
    const exp = 'wrap(true ? bar(0) : yield baz(1))';
    evalExpression(exp).run(val => {
      expect(val).toEqual({ wrap: { bar: 0 } });
      expect(log).toEqual([
        { bar: 0 },
        { wrap: { bar: 0 } }
      ]);
      done();
    });
  });

  it('conditional with yield', done => {
    const exp = 'wrap((yield truthy()) ? bar(1) : yield baz())';
    evalExpression(exp).run(val => {
      expect(val).toEqual({ wrap: { bar: 1 } });
      expect(log).toEqual(['truthy', { bar: 1 }, { wrap: { bar: 1 } }]);
      done();
    });
  });
  
  it('conditional not top node - right branch', done => {
    const exp = 'wrap((yield falsy()) ? bar(0) : yield baz(1))';
    evalExpression(exp).run(val => {
      expect(val).toEqual({ wrap: { baz: 1 } });
      expect(log).toEqual([
        'falsy',
        { baz: 1 },
        { request: { baz: 1 } },
        { resolve: { baz: 1 } },
        { wrap: { baz: 1 } }
      ])
      done();
    });
  });
  
  it('yield to ternary', done => {
    const exp = 'wrap(yield (true ? quux(0) : yield baz(0)))';
    evalExpression(exp).run(val => {
      expect(val).toEqual({ wrap: { quux: 0 } });
      expect(log).toEqual([{ quux: 0 }, { wrap: { quux: 0 } }]);
      done();
    });
  });
  
  it('ternary with three yields', done => {
    const exp = '(yield truthy()) ? yield baz(3) : (yield truthy())';
    evalExpression(exp).run(val => {
      expect(val).toEqual({ baz: 3 });
      expect(log).toEqual([
        'truthy',
        { baz: 3 },
        { request: { baz: 3 } },
        { resolve: { baz: 3 } },
      ]);
      done();
    });
  });
  
  // Or
  
  it('or-expression - no yields', done => {
    const exp = '(10 || bar(0))';
    evalExpression(exp).run(val => {
      expect(val).toEqual(10);
      expect(log).toEqual([]);
      done();
    });
  });
  
  it('or-expression falsy', done => {
    const exp = '(yield falsy()) || (yield baz(10))';
    evalExpression(exp).run(val => {
      expect(val).toEqual({ baz: 10 });
      expect(log).toEqual([ 'falsy', { baz: 10 }, { request: { baz: 10 } }, { resolve: { baz: 10 } } ]);
      done();
    });
  });
  
  it('or-expression falsy - no yield in left', done => {
    const exp = 'false || (yield baz(3))';
    evalExpression(exp).run(val => {
      expect(val).toEqual({ baz: 3 });
      expect(log).toEqual([ { baz: 3 }, { request: { baz: 3 } }, { resolve: { baz: 3 } } ]);
      done();
    });
  });
  
  it('or-expression falsy - no yield in right', done => {
    const exp = '(yield falsy()) || "str"';
    evalExpression(exp).run(val => {
      expect(val).toEqual('str');
      expect(log).toEqual(['falsy']);
      done();
    });
  });
  
  it('or-expression truthy', done => {
    const exp = '(yield truthy()) || (yield baz("b"))';
    evalExpression(exp).run(val => {
      expect(val).toEqual(true);
      expect(log).toEqual(['truthy']);
      done();
    });
  });
  
  it('or-expression truthy - no yield in left', done => {
    const exp = '"true!" || (yield baz("baz"))';
    evalExpression(exp).run(val => {
      expect(val).toEqual('true!');
      expect(log).toEqual([]);
      done();
    });
  });
  
  it('or-expression truthy - no yield in right', done => {
    const exp = '(yield truthy()) || "baz!"';
    evalExpression(exp).run(val => {
      expect(val).toEqual(true);
      expect(log).toEqual(['truthy']);
      done();
    });
  });
  
  // And
  
  it('and-expression - no yields', done => {
    const exp = '(10 && "false")';
    evalExpression(exp).run(val => {
      expect(val).toEqual("false");
      done();
    });
  });
  
  it('and-expression falsy', done => {
    const exp = '(yield falsy()) && (yield baz(1))';
    evalExpression(exp).run(val => {
      expect(val).toEqual(false);
      expect(log).toEqual(['falsy']);
      done();
    });
  });
  
  it('and-expression falsy - no yield in left', done => {
    const exp = 'false && (yield baz())';
    evalExpression(exp).run(val => {
      expect(val).toEqual(false);
      expect(log).toEqual([]);
      done();
    });
  });
  
  it('and-expression falsy - no yield in right', done => {
    const exp = '(yield falsy()) && "baz!"';
    evalExpression(exp).run(val => {
      expect(val).toEqual(false);
      expect(log).toEqual(['falsy']);
      done();
    });
  });
  
  it('and-expression truthy', done => {
    const exp = '(yield truthy()) && (yield baz(1))';
    evalExpression(exp).run(val => {
      expect(val).toEqual({ baz: 1 });
      expect(log).toEqual(['truthy', { baz: 1 }, { request: { baz: 1 } }, { resolve: { baz: 1 } } ]);
      done();
    });
  });
  
  it('and-expression truthy - no yield in left', done => {
    const exp = '"true!" && (yield baz(1))';
    evalExpression(exp).run(val => {
      expect(val).toEqual({ baz: 1 });
      expect(log).toEqual([{ baz: 1 }, { request: { baz: 1 } }, { resolve: { baz: 1 } } ]);
      done();
    });
  });
  
  it('and-expression truthy - no yield in right', done => {
    const exp = '(yield truthy()) && "baz!"';
    evalExpression(exp).run(val => {
      expect(val).toEqual('baz!');
      expect(log).toEqual(['truthy']);
      done();
    });
  });

  // Negation
  it('logical negation', done => {
    const exp = 'yield baz(!true)';
    evalExpression(exp).run(val => {
      expect(val).toEqual({ baz: false });
      done();
    });
  });
  
  // Assignment expressions
  it('mutation and yield ordering 1', done => {
    const exp = 'yield ((mutable_int += 1) + bar(mutable_int).bar)'
    evalExpression(exp, { hackyInts: true }).run(val => {
      expect(val).toEqual(2);
      done();
    });
  });

  it('mutation and yield ordering 2', done => {
    const exp = 'yield ((mutable_int++) + bar(mutable_int).bar)'
    evalExpression(exp, { hackyInts: true }).run(val => {
      expect(val).toEqual(1);
      done();
    });
  });
  
  it('mutation and yield ordering 3', done => {
    const exp = 'yield ((++mutable_int) + bar(mutable_int).bar)'
    evalExpression(exp, { hackyInts: true }).run(val => {
      expect(val).toEqual(2);
      done();
    });
  });
});

