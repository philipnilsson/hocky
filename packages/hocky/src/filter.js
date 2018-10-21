import React from 'react';
import HOC from './hoc';

class Filter extends React.Component {

  state = {
    value: this.props.value
  };
  
  last = {};
  
  componentWillReceiveProps({ value, condition }) {
    if (condition && value !== this.last) {
      this.setState({ value });
    }
    this.last = value;
  }
  
  render() {
    return this.props.children(this.state.value);
  }
}

export default function filter(value, condition) {
  return new HOC(consumer => (
    <Filter condition={condition} value={value}>
        {consumer}
    </Filter>
  ));
}
