import React, { Component } from 'react';
import HOC from './hoc';

export { default as debounce } from './debounce';
export { default as delay } from './delay';
export { default as echo } from './echo';
export { default as load } from './load';
export { default as toggle } from './toggle';

export default function hocky(f) {
  return () => f().run();
}

export const pure = a => new HOC(consumer => consumer(a));
