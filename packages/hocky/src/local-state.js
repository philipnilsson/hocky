import React from 'react';
import HOC from './hoc';

class LocalState extends React.PureComponent {
  constructor(props, ctx) {
    super(props, ctx);
    const { actions, initial } = this.props.stateMachine;
    this.state = { state: initial };
    this.mappedActions = {};
    for (const key of Object.keys(this.props.stateMachine.actions)) {
      this.mappedActions[key] = (...args) => {
        const handle = this.props.stateMachine.actions[key](...args);
        this.setState(state => ({ state: handle(state.state) }));
      }
    };
  }
  
  render() {
    return this.props.children([
      this.state.state,
      this.mappedActions
    ]);
  }
}

export default function localState(stateMachine) {
  return new HOC(consumer => 
    <LocalState stateMachine={stateMachine}>{consumer}</LocalState>
  );
};
