import React from 'react';
import HOC from './hoc';

class Window extends React.PureComponent {
  state = {
    values: [this.props.value]
  }
  
  componentWillReceiveProps({ value, window }) {
    if (this.state.values.length > 0 && value !== this.state.values[0]) {
      this.setState({
        values: [value, ...this.state.values].slice(0, window)
      });
    }
  }
  
  render() {
    return this.props.children(this.state.values);
  }
}

export default function window(value, window) {
  return new HOC(
    consumer => <Window window={window} value={value}>{consumer}</Window>
  );
}

