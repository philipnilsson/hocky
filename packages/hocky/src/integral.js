import React from 'react';
import HOC from './hoc';

class Integral extends React.PureComponent {
  state = {
    value: this.props.value,
    lastValidValue: this.props.value
  }
  
  bind = {
    type: 'number',
    onChange: event => {
      const value = event.currentTarget.value.replace(/[^\d]/g, '');
      const intVal = parseInt(value, 10);
      this.setState(state => ({
        value,
        lastValidValue: isNaN(intVal) ? state.lastValidValue : intVal
      }));
    },
    onBlur: () => {
      this.setState(state => ({ value: state.lastValidValue }));
    }
  }
  
  render() {
    const { value, lastValidValue } = this.state;
    return this.props.children({
      value: lastValidValue,
      bind: {...this.bind, value }
    });
  }
}

export default function integral(value) {
  return new HOC(consumer => 
    <Integral value={value}>{consumer}</Integral>
  );
};
