import gen from '@babel/generator';
import { transformSync } from '@babel/core';
import compile from '../compiler';
import { callCC, debug } from '../util';
import env, { log } from './env';
import * as t from '@babel/types';

const plugins = [
  {
    visitor: {
      FunctionExpression(path) {
        if (path.node.generator) {
          const return_id = t.identifier(path.scope.generateUid('return'));
          const [ node, subs ] = compile(path.scope, return_id)(path.node);
          if (subs.length) {
            throw new Error('Hocky internal error - Unexpected unhandled substitutions.');
          }
          path.replaceWith(callCC(return_id, node.body));
        }
      }
    }
  },
  'babel-plugin-transform-do-expressions'
];

function evalStatement(expr) {
  const { ast } = transformSync(`(function* () { ${expr} })`, { plugins, ast: true });
  const e = ast.program.body[0].expression;
  /* eslint-disable no-new-func */
  return (new Function(...Object.keys(env), 'return ' + gen(e).code))(
    ...Object.values(env)
  );
}

describe('statement evalutation tests', () => {
  it('just return', done => {
    const exp = 'return';
    evalStatement(exp)
      .run(val => {
        expect(val).toEqual(undefined);
        done();
      });    
  });
  
  it('pure return', done => {
    const exp = 'return 3';
    evalStatement(exp)
      .run(val => {
        expect(val).toEqual(3);
        expect(log).toEqual([]);
        done();
      });
  });

  it('impure return', done => {
    const exp = 'return bar(0)';
    evalStatement(exp)
      .run(val => {
        expect(val).toEqual({ bar: 0 });
        expect(log).toEqual([{ bar: 0 }]);
        done();
      });
  });

  it('monadic return', done => {
    const exp = 'return yield baz(12)';
    evalStatement(exp)
      .run(val => {
        expect(val).toEqual({ baz: 12 });
        expect(log).toEqual([ { baz: 12 }, { request: { baz: 12 } }, { resolve: { baz: 12 } } ]);
        done();
      });
  });

  it('declaration and return', done => {
    const exp = `
const { val } = { val: 10 };
return wrap(val);
    `;
    evalStatement(exp)
      .run(val => {
        expect(val).toEqual({ wrap: 10 });
        done();
      });
  });
  
  it('declaration and return', done => {
    const exp = `
const { val } = { val: [yield baz(1), yield baz(2)] };
return wrap(val);
    `;
    evalStatement(exp).run(val => {
      expect(val).toEqual({ wrap: [ { baz: 1 }, { baz: 2 } ] });
      expect(log).toEqual([
        { baz: 1 },
        { request: { baz: 1 } },
        { resolve: { baz: 1 } },
        { baz: 2 },
        { request: { baz: 2 } },
        { resolve: { baz: 2 } },
        { wrap: [ { baz: 1 }, { baz: 2 } ] }
      ]);
      done();
    });
  });

  it('expression statement', done => {
    const exp = `
const { key } = { key: yield baz('foo') };
return wrap({ key, key2: yield baz(2) });
`;
    evalStatement(exp)
      .run(val => {
        expect(val).toEqual({ wrap: { key: { baz: 'foo' }, key2: { baz: 2 } } });
        expect(log).toEqual([
          { baz: 'foo' },
          { request: { baz: 'foo' } },
          { resolve: { baz: 'foo' } },
          { baz: 2},
          { request: { baz: 2 } },
          { resolve: { baz: 2 } },
          { wrap: { key: { baz: 'foo' }, key2: { baz: 2 } } }
        ]);
        done();
      });
  });

  it('monadic expression statement', done => {
    const exp = `
const { key } = { key: 'bar' };
console.log(yield (yield foo));
return 2;
`;
    evalStatement(exp)
      .run(val => {
        expect(val).toEqual(2);
        expect(log).toEqual([
          'foo-outer',
          'foo-inner',
          { console: { log: ['foo'] } }
        ]);
        done();
      });
  });

  it('two impure expression statements', done => {
    const exp = `
const { key } = { key: yield baz(0) };
console.log(bar(1));
console.log(yield baz(2));
console.log(yield (yield foo));
return wrap(key);
`;
    evalStatement(exp)
      .run(val => {
        expect(val).toEqual({ wrap: { baz: 0 } });
        expect(log).toEqual([
          {"baz": 0},
          {"request": {"baz": 0}},
          {"resolve": {"baz": 0}},
          {"bar": 1},
          {"console": {"log": [{"bar": 1}]}},
          {"baz": 2},
          {"request": {"baz": 2}},
          {"resolve": {"baz": 2}},
          {"console": {"log": [{"baz": 2}]}},
          "foo-outer",
          "foo-inner",
          {"console": {"log": ["foo"]}},
          {"wrap": {"baz": 0}}
        ]);
        done();
      });
  });
  
  it('yield in variable declarator + shadowing', done => {
    const exp = `
const { foo, baz = yield baz(1) } = { foo: yield yield foo };
return [ foo, baz ];
`;
    evalStatement(exp).run(val => {
      expect(val).toEqual(['foo', { baz: 1 } ]);
      done();
    });
  });
  
  it('early return', done => {
    const exp = `
1 + 2;
const { key } = { key: yield baz() };
baz(1 + 2);
return 'early';
console.log('456');
console.log(yield (yield foo));
return id(key);
`;
    evalStatement(exp)
      .run(val => {
        expect(val).toEqual('early');
        //expect(env.console.log).not.toHaveBeenCalled();
        done();
      });
  });

  it('do-expression', done => {
    const exp = `
const exp = do { console.log('!'); 1 + 2; };
return exp;
`;
    evalStatement(exp)
      .run(val => {
        expect(val).toEqual(3);
        expect(log).toEqual([
          { console: { log: ['!'] } }
        ]);
        done();
      })
  });

  it('empty do-expression', done => {
    const exp = `
const exp = do { };
return exp;
`;
    evalStatement(exp)
      .run(val => {
        expect(val).toEqual(undefined);
        expect(log).toEqual([]);
        done();
      })
  })
  
  it('do-expression with yield', done => {
    const exp = `
const exp = do { console.log('!'); yield baz(1); 1 + 2; };
return exp;
`;
    evalStatement(exp)
      .run(val => {
        expect(val).toEqual(3);
        expect(log).toEqual([
          { console: { log: ['!'] } },
          { baz: 1 },
          { request: { baz: 1}},
          { resolve: { baz: 1}}
        ]);
        done();
      })
  });

  it('if-statements', done => {
    const exp = `
if (yield baz(1)) {
  return 1;
}
`;
    evalStatement(exp)
      .run(val => {
        expect(val).toEqual(1);
        expect(log).toEqual([
          { baz: 1},
          { request: { baz: 1 }},
          { resolve: { baz: 1 }}
        ]);
        done();
      })
  });
  
  it('if-statement yield in test', done => {
    const exp = `
if (!(yield yield foo)) {
  return 1;
}
`;
    evalStatement(exp).run(val => {
      expect(val).toEqual(undefined);
      expect(log).toEqual([ 'foo-outer', 'foo-inner']);
      done();
    });
  });
  
  it('if-statement yield in test. effect in body', done => {
    const exp = `
if (!(yield yield foo)) {
  return bar(1);
}
`;
    evalStatement(exp).run(val => {
      expect(val).toEqual(undefined);
      expect(log).toEqual([ 'foo-outer', 'foo-inner']);
      done();
    });
  });

  it('if-statement else branch', done => {
    const exp = `
if (!(yield yield foo)) {
  return bar(1);
} else {}`;
    evalStatement(exp).run(val => {
      expect(val).toEqual(undefined);
      expect(log).toEqual([ 'foo-outer', 'foo-inner']);
      done();
    });
  });
  
  it('if-statement else branch', done => {
    const exp = `
if (!(yield yield foo)) {
  return bar(1);
} else { 2; }`;
    evalStatement(exp).run(val => {
      expect(val).toEqual(undefined);
      expect(log).toEqual([ 'foo-outer', 'foo-inner']);
      done();
    });
  });

  it('if-statement else branch with return', done => {
    const exp = `
if (!(yield yield foo)) {
  return bar(1);
} else { return 2; }`;
    evalStatement(exp).run(val => {
      expect(val).toEqual(2);
      expect(log).toEqual([ 'foo-outer', 'foo-inner']);
      done();
    });
  });
  
  it('if-statement else branch with yields', done => {
    const exp = `
if (!(yield yield foo)) {
  return bar(1);
} else { 
  bar(10);
  return yield yield foo;
}`;
    evalStatement(exp).run(val => {
      expect(val).toEqual('foo');
      expect(log).toEqual([
        'foo-outer',
        'foo-inner',
        { bar: 10 },
        'foo-outer',
        'foo-inner'
      ]);
      done();
    });
  });

  it('if-statement else branch expr-statement in alternate', done => {
    const exp = `
if (!(yield yield foo)) {
  return bar(1);
} else 2;`;
    evalStatement(exp).run(val => {
      expect(val).toEqual(undefined);
      expect(log).toEqual([
        'foo-outer',
        'foo-inner'
      ]);
      done();
    });
  });

  it('if-statement else branch expr-statment in consequent', done => {
    const exp = `
if (yield yield foo) 1
else 2;`;
    evalStatement(exp).run(val => {
      expect(val).toEqual(undefined);
      expect(log).toEqual([
        'foo-outer',
        'foo-inner'
      ]);
      done();
    });
  });

  it('if-statement else branch expr-statment in consequent', done => {
    const exp = `if (yield yield foo) return 10`;
    evalStatement(exp).run(val => {
      expect(val).toEqual(10);
      expect(log).toEqual([
        'foo-outer',
        'foo-inner'
      ]);
      done();
    });
  });

  it('if-statement with else-if', done => {
    const exp = `
if (yield baz(1)) {
  return bar(1);
} else if (yield baz(2)) {
  return bar(2);
} else {
  return bar(3);
}`;
    evalStatement(exp).run(val => {
      expect(val).toEqual({ bar: 1 });
      expect(log).toEqual([
        { baz: 1 },
        { request: { baz: 1 } },
        { resolve: { baz: 1 } },
        { bar: 1 }
      ]);
      done();
    });
  });

  it('if-statement with else-if 2', done => {
    const exp = `
if (!(yield baz(1))) {
  return bar(1);
} else if (yield baz(2)) {
  return bar(2);
} else {
  return bar(3);
}`;
    evalStatement(exp).run(val => {
      expect(val).toEqual({ bar: 2 });
      expect(log).toEqual([
        { baz: 1 },
        { request: { baz: 1 } },
        { resolve: { baz: 1 } },
        { baz: 2 },
        { request: { baz: 2 } },
        { resolve: { baz: 2 } },
        { bar: 2 }
      ]);
      done();
    });
  });
  
  it('if-statement with else-if 3', done => {
    const exp = `
if (!(yield baz(1))) {
  return bar(1);
} else if (!(yield baz(2))) {
  return bar(2);
} else {
  return bar(3);
}`;
    evalStatement(exp).run(val => {
      expect(val).toEqual({ bar: 3 });
      expect(log).toEqual([
        { baz: 1 },
        { request: { baz: 1 } },
        { resolve: { baz: 1 } },
        { baz: 2 },
        { request: { baz: 2 } },
        { resolve: { baz: 2 } },
        { bar: 3 }
      ]);
      done();
    });
  });

  it('multi-branch if-statement', done => {
    const exp = `
console.log('foo')
if (false) return bar(1)
else if (false) return bar(2)
else if (false) return bar(3)
else return bar(4);
`;
    evalStatement(exp).run(val => {
      expect(val).toEqual({ bar: 4 });
      expect(log).toEqual([
        { console: { log: ['foo'] } },
        { bar: 4 }
      ]);
      done();
    });
  });
});
