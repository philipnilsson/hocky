import React from 'react';
import HOC from './hoc';

class Delay extends React.Component {

  state = {
    value: this.props.value
  }
  
  timers = [];
  
  setDelay(dt, value) {
    this.timers.push[
      setTimeout(() => this.setState({ value }), dt)
    ];
  }
  
  componentWillReceiveProps({ value, delay }) {
    this.setDelay(delay, value);
  }
  
  componentWillUnmount() {
    this.timers.forEach(clearTimeout);
  }
  
  render() {
    return this.props.children(this.state.value);
  }
}

export default function delay(value, dt) {
  return new HOC(
    consumer => <Delay delay={dt} value={value}>{consumer}</Delay>
  );
}

