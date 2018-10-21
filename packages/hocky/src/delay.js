import React from 'react';
import HOC from './hoc';

const SHOW_IMMEDIATE = {};

class Delay extends React.PureComponent {
  state = {
    value: this.props.initial === SHOW_IMMEDIATE
         ? this.props.value
         : this.props.initial
  };
  
  timers = [];
  
  setDelay(dt, value) {
    this.timers.push[
      setTimeout(() => this.setState({ value }), dt)
    ];
  }
  
  componentDidMount() {
    if (this.props.initial !== SHOW_IMMEDIATE) {
      this.setDelay(this.props.dt, this.props.value);
    }
  }
  
  componentWillReceiveProps({ value, dt }) {
    if (value !== this.props.value) {
      this.setDelay(dt, value);
    }
  }
  
  componentWillUnmount() {
    this.timers.forEach(clearTimeout);
  }
  
  render() {
    return this.props.children(this.state.value);
  }
}

export default function delay(value, dt, initial = SHOW_IMMEDIATE) {
  return new HOC(
    consumer => <Delay dt={dt} value={value} initial={initial}>{consumer}</Delay>
  );
}

