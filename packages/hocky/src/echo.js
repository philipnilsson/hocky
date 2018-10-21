import React from 'react';
import HOC from './hoc';

class Echo extends React.Component {
  state = {
    value: this.props.value
  }
  
  bind = {
    type: 'text',
    onChange: event => this.setState({
      value: event.currentTarget.value
    })
  }
  
  render() {
    return this.props.children({
      value: this.state.value,
      bind: {...this.bind, value: this.state.value}
    });
  }
}

export default function echo(value) {
  return new HOC(consumer => 
    <Echo value={value}>{consumer}</Echo>
  );
};
