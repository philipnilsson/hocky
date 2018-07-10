import compiler from './compiler';

require('fs').writeFileSync('/tmp/wat.txt', 'Running the Hocky plugin.');

export default function () {
  return {
    visitor: {
      FunctionExpression(path) {
        if (path.node.generator) {
          const [ node, subs ] = compile(path.scope)(path.node);
          if (subs.length) {
            throw new Error('Hocky Internal Error- Unhandled substitutions.');
          }
          path.replaceWith(node);
          path.node.generator = false;
        }
      }
    }
  }
};
