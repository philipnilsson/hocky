import React, { Component } from 'react';
import HOC from './hoc';

export { default as debounce } from './debounce';
export { default as delay } from './delay';
export { default as echo } from './echo';
export { default as load } from './load';
export { default as toggle } from './toggle';
export { default as interval } from './interval';
export { default as filter } from './filter';
export { default as window } from './window';
export { default as timeWindow } from './timeWindow';
export { default as localState } from './local-state';
export { default as integral } from './integral';
export { default as select } from './select';
export { max, min } from './foldIdempotent';                                            

export default function hocky(f) {
  return () => f().run();
}

export const pure = a => new HOC(consumer => consumer(a));
