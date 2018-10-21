import React from 'react';
import HOC from './hoc';
import debounceFn from 'lodash/debounce';

class Debounce extends React.Component {
  state = {
    value: this.props.value
  }

  update = debounceFn(() => {
    !this.unmounted && this.setState({ value: this.props.value });
  }, /* TODO: Allow updating this */ this.props.debounce);
  
  componentWillReceiveProps() {
    this.update();
  }
  
  componentWillUmount() {
    // Find a way to clear the lodash debounce timer
    // or use a different function
    this.unmounted = true;
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
