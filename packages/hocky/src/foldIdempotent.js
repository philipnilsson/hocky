import React from 'react';
import HOC from './hoc';

class Fold extends React.PureComponent {
  state = {
    value: this.props.value
  }
  
  componentWillReceiveProps({ value, fold }) {
    this.setState({
      value: fold(this.state.value, value)
    });
  }
  
  render() {
    return this.props.children(this.state.value);
  }
}

export default function foldIdempotent(value, fold) {
  return new HOC(consumer => 
    <Fold fold={fold} value={value}>{consumer}</Fold>
  );
};

export const max = value =>
  foldIdempotent(value, (x, y) => Math.max(x,y));

export const min = value =>
  foldIdempotent(value, (x, y) => Math.min(x,y));
