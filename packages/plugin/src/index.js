import compile from './compiler';

export default function () {
  return {
    visitor: {
      FunctionExpression(path) {
        console.log('Running the hocky plugin');
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
  }
};
