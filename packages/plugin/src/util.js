import * as t from '@babel/types';

export const pure = node => 
  t.callExpression(t.identifier('pure'), [node]);

export const _undefined =
  t.unaryExpression('void', t.numericLiteral(0));

export const ensureBlock = st => {
  st = st || t.blockStatement([]);
  return t.isBlockStatement(st) ? st : t.blockStatement([st]);
};

export const callCC = (_return, body) =>
  t.callExpression(
    t.identifier('callCC'), [
      t.arrowFunctionExpression(
        [_return],
        body
      )
    ]
  );
