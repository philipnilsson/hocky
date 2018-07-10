import * as t from '@babel/types';
import { pure, _undefined, ensureBlock } from './util';
import gen from '@babel/generator';

const impure = (node, scope) => {
  const sub = scope.generateUidIdentifierBasedOnNode(node);
  return [ sub, { node, impure: sub } ];
};

const yields = (node, scope) => {
  const sub = scope.generateUidIdentifierBasedOnNode(node);
  return [ sub, { node, yields: sub } ];
};

const traverse = arr => {
  const nodes = [], subs = [];
  for (const [node, subs_node] of arr) {
    nodes.push(node);
    subs.push(...subs_node);
  }
  return [ nodes, subs ];
};

const children = node => {
  return t.VISITOR_KEYS[node.type]
    .map(key => [ key, node[key] ])
    .filter(([, child ]) => child instanceof Array || (child && child.type))
}

const compileToDoExpr = (subs, expr) => 
  t.doExpression(
    t.blockStatement(
      blockFromEffects(subs)([ t.returnStatement(pure(expr))])
    )
  );

const yieldExpr = (effect, arg, block) =>
  t.returnStatement(
    t.callExpression(
      t.memberExpression(effect, t.identifier('chain')),
      [ t.arrowFunctionExpression([arg], t.blockStatement(block)) ]
    )
  );  

const intermediate = (effect, arg, block) => [
  t.variableDeclaration('const', [t.variableDeclarator(arg, effect)]),
  ...block
];

const blockFromEffects = dict => block => [...dict].reduceRight(
  (block, effect) => {
    if (effect.impure) {
      return intermediate(effect.node, effect.impure, block);
    } else if (effect.yields) {
      return [ yieldExpr(effect.node, effect.yields, block) ];
    } else if (effect.hoist) {
      return [ effect.hoist, ...block ];
    } else { 
      console.log('wat', effect);
      throw new Error(`Hocky internal error, unrecognized effect ${effect}`);
    }
  },
  block
);

const concat = function (...args) {
  return [].concat(...args);
}

export default function compile(scope, _return = t.identifier('pure')) {
  return function compile(node) {
    
    if (node instanceof Array) {
      return traverse(node.map(compile));
    }

    else if (t.isReturnStatement(node)) {
      const escape = node => t.callExpression(_return, [node]);

      if (!node.argument) {
        node.argument = escape(_undefined);
        return [ node, concat() ];
      }
      const [arg, subs] = compile(node.argument);
      node.argument = escape(arg);
      return [t.emptyStatement(), concat(subs, [{ hoist: node }])];
    }

    else if (t.isFunction(node) && !node.generator) {
      return [node, []];
    }
    
    else if (t.isIfStatement(node)) {
      const [ tst, subs_tst ] = compile(node.test);
      const [ con, subs_con ] = compile(t.doExpression(ensureBlock(node.consequent)));
      const [ alt, subs_alt ] = compile(t.doExpression(ensureBlock(node.alternate)));
      
      const passUndefined = t.expressionStatement(pure(_undefined))
      const ccon = blockFromEffects(subs_con)(con.body.body)
      const calt = blockFromEffects(subs_alt)(alt.body.body)
      
      node.consequent = t.blockStatement([...ccon, passUndefined]);
      node.alternate = t.blockStatement([...calt, passUndefined]);
      node.test = tst;
      
      const [sub, eff] = yields(
        t.doExpression(t.blockStatement([node])),
        scope
      );
      return [
        t.returnStatement(pure(sub)),
        concat(subs_tst, [eff])
      ];
    }
    
    else if (t.isDoExpression(node)) {
      const block = node.body.body;
      if (block.length) {
        block[block.length - 1].isLastLineOfDo = true;
      }
      const [ body, subs ] = compile(block);
      node.body.body = body;
      return [ node, subs ];
    }
    
    else if (t.isExpressionStatement(node) && !node.isLastLineOfDo) {
      const [ , subs ] = compile(node.expression);
      return [ t.emptyStatement(), subs ];
    }
    
    else if (t.isBlockStatement(node)) {
      const [ block, subs ] = compile(node.body);
      node.body = blockFromEffects(subs)(block);
      return [ node, concat() ];
    }

    else if (t.isVariableDeclaration(node)) {
      const [ declarations, subs ] = compile(node.declarations);
      node.declarations = declarations;
      return [ t.emptyStatement(), concat(subs, [{ hoist: node }])];
    }

    else if (t.isAssignmentExpression(node)) {
      const [ left, subs_left ] = compile(node.left);
      const [ right, subs_right ] = compile(node.right);
      node.left = left;
      node.right = right;
      const [ sub, eff ] = impure(node, scope);
      return [ sub, concat(subs_right, subs_left, [eff]) ];
    }

    else if (t.isUpdateExpression(node)) {
      const [ arg, subs ] = compile(node.argument);
      node.argument = arg;
      const [ sub, eff ] = impure(node, scope);
      return [ sub, concat(subs, [eff]) ];
    }
    
    else if (t.isCallExpression(node)) {
      const [ callee, subs_callee ] = compile(node.callee);
      const [ args, subs_args ] = compile(node.arguments);
      node.callee = callee;
      node.arguments = args;
      const [ sub, eff ] = impure(node, scope);
      return [ sub, [ ...subs_callee, ...subs_args, eff ] ];
    }

    else if (t.isConditional(node)) {
      const [ tst, subs_tst ] = compile(node.test);
      const [ con, subs_con ] = compile(node.consequent);
      const [ alt, subs_alt ] = compile(node.alternate);
      const ternary = t.conditionalExpression(
        tst,
        compileToDoExpr(subs_con, con),
        compileToDoExpr(subs_alt, alt)
      );
      const [ sub, eff ] = yields(ternary, scope);
      return [ sub, concat(subs_tst, [eff]) ];
    }

    else if (t.isLogicalExpression(node)) {
      const [ left, subs_left ] = compile(node.left);
      const [ cons, alt ] =
        node.operator === '||'
        ? [left, node.right]
        : [node.right, left];
      const [ tern, subs_tern ] = compile(
        t.conditionalExpression(left, cons, alt)
      );
      return [ tern, concat(subs_left, subs_tern) ];
    }

    else if (t.isYieldExpression(node)) {
      const [ arg, subs ] = compile(node.argument);
      node.argument = arg;
      const [ sub, eff ] = yields(node.argument, scope);
      return [ sub, concat(subs, [eff]) ];
    }

    else {
      const nodes = [], subs = [];
      for (const [ key, child ] of children(node)) {
        const [new_child, subs_node] =
          (child instanceof Array)
          ? compile(child.map(t.clone))
          : compile(t.clone(child));
        nodes.push([key, new_child]);
        subs.push(...subs_node);
      };
      for (const [key, child] of nodes) {
        node[key] = child;
      }
      return [ node, subs ];
    }
  }
}
