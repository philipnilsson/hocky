import React from 'react';
import HOC from './hoc';

class UpdateWhen extends React.Component {

  shouldComponentUpdate({ condition }) {
    return condition;
  }
  
  render() {
    const { children } = this.props;
    return children();
  }
}

export default function updateWhen(condition) {
  console.log('???', condition);
  return new HOC(consumer => (
    <UpdateWhen condition={condition}>
        {consumer}
    </UpdateWhen>
  ));
}
