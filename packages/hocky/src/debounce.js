import React from 'react';
import HOC from './hoc';
import debounceFn from 'lodash/debounce';

class Debounce extends React.Component {
  state = {
    value: this.props.value
  }

  update = debounceFn(() => {
    this.setState({ value: this.props.value });
    this.forceUpdate();
  }, this.props.debounce);
  
  componentWillReceiveProps() {
    this.update();
  }
  
  shouldComponentUpdate(newProps) {
    return this.props.children !== newProps.children;
  }
  
  render() {
    return this.props.children(this.state.value);
  }
}

export default function debounce(value, dt) {
  return new HOC(
    consumer => <Debounce debounce={dt} value={value}>{consumer}</Debounce>
  );
}
