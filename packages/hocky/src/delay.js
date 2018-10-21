import React from 'react';
import HOC from './hoc';

class Delay extends React.Component {

  state = {
    value: this.props.value
  }
  
  componentWillReceiveProps({ value }) {
    setTimeout(() => this.setState({ value }), this.props.delay);
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

