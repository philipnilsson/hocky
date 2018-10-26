import React from 'react';
import ReactDOM from 'react-dom';
import hocky, { pure, echo, interval, load, debounce, delay, localState, integral, select } from 'hocky';

const counter = increment => localState({
  initial: 0,
  actions: {
    increment: () => counter => counter + increment,
    decrement: () => counter => counter - increment
  }
});

const options = [
  ['a)', [1, 2, 3]],
  ['b)', [4, 5, 6]],
  ['c)', [100, 200, 300]]
];

const Test = hocky(function*() {
  const menu = yield select(options);
  const submenu = yield select(menu.value);
  const [count, actions] = yield counter(submenu.value);
  return (
    <div>
        <select {...menu.bind} />
        <select {...submenu.bind} />
        <div>{count}</div>
        <button onClick={actions.increment}>Add</button>
        <button onClick={actions.decrement}>Sub</button>
    </div>
  );
});

document.addEventListener('DOMContentLoaded', () => {
  ReactDOM.render(
    <Test />,
    document.getElementById('index')
  );
});
