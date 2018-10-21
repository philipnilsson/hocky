import React from 'react';
import HOC from './hoc';

class Toggle extends React.Component {
  state = {
    checked: this.props.checked
  }
  
  bind = {
    type: 'checkbox',
    checked: this.state.checked,
    onChange: event => this.setState({
      checked: event.currentTarget.checked
    })
  }
  
  render() {
    const { props: { children }, state: { checked } } = this;
    return children({
      checked,
      bind: { ...this.bind, checked }
    });
  }
}

export default function toggle(checked) {
  return new HOC(
    consumer => <Toggle checked={checked}>{consumer}</Toggle>
  );
}
