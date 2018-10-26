import React from 'react';
import HOC from './hoc';

class TimeWindow extends React.PureComponent {
  state = {
    values: [this.props.value]
  }
  
  lastValue = {};
  timers = []
  queue(window) {
    this.timers.push(setTimeout(
      () => this.setState({ values: this.state.values.slice(0, -1) }),
      window
    ))      
  }
  
  componentDidMount() {
    this.queue(this.props.timeWindow);
  }
  
  componentWillReceiveProps({ value, timeWindow }) {
    if (value !== this.lastValue) {
      this.lastValue = value;
      this.setState({
        values: [value, ...this.state.values]
      });
      this.queue(timeWindow)
    }
  }
  
  componentWillUnmount() {
    this.timers.forEach(clearTimeout);
  }
  
  render() {
    return this.props.children(this.state.values);
  }
}

export default function timeWindow(value, time) {
  return new HOC(consumer =>
    <TimeWindow timeWindow={time} value={value}>{consumer}</TimeWindow>
  );
}

