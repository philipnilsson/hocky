import React from 'react';
import HOC from './hoc';

const now = () => new Date().getTime();

class Interval extends React.Component {

  timestamp = now();
  
  state = { count: 0 }
  
  update = () => {
    this.timestamp = now();
    this.setState({ count: this.state.count + 1 })
  };
  
  componentWillMount() {
    this.timer = setInterval(this.update, this.props.dt);
  }
  
  componentWillUnmount() {
    clearInterval(this.timer);
  }

  componentWillReceiveProps({ dt }) {
    if (dt !== this.props.dt) {
      clearInterval(this.timer);
      this.timer = setTimeout(
        () => {
          this.update();
          this.timer = setInterval(this.update, dt);
        },
        dt - (now() - this.timestamp)
      );
    }
  }
  
  render() {
    const { props: { children }, state: { count } } = this;
    return children(count);
  }
}

export default function interval(dt) {
  return new HOC(
    consumer => <Interval dt={dt}>{consumer}</Interval>
  );
}
