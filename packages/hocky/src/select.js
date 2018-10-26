import React from 'react';
import HOC from './hoc';

const ensureArray = a => a instanceof Array ? a : [a];

class Select extends React.PureComponent {
  constructor(props, context) {
    super(props, context);
    this.state = this.stateKeys(props);
    this.state.options = this.getOptions(props.options);
  }

  stateKeys(props) {
    const [ label, value = label, key = label ] = this.findValue(props.initial, props.options);
    return { value, key };
  }
  
  componentWillReceiveProps(props) {
    this.setState({
      options: this.getOptions(props.options),
      ...this.stateKeys(props)
    });
  }
  
  findValue(target, options) {
    const result = options.map(ensureArray).find(option => {
      const [ label, value = label, key = label ] = option;      
      return target === `${key}`
    }) || ensureArray(options[0]) || [null];
    return result;
  }
  
  getOptions(options) {
    return options.map(option => {
      const [ label, value = label, key = label ] = ensureArray(option);
      return (
        <option key={key} value={key}>{label}</option>
      );
    });
  }
  
  bind = {
    onChange: event => {
      console.log('options', this.props.options);
      const [ label, value = label, key = label ] =
        this.findValue(event.currentTarget.value, this.props.options);
      this.setState(() => ({ value, key }));
    },
  };
  
  render() {
    const { value, key } = this.state;
    return this.props.children({
      value,
      bind: {
        ...this.bind, 
        children: this.state.options,
        value: key,
      }
    });
  }
}

export default function select(options, initial) {
  if (!initial) {
    const [label, value = label, key = label] = ensureArray(options[0]) || [null];
    initial = key;
  }
  return new HOC(consumer => 
    <Select options={options} initial={initial}>{consumer}</Select>
  );
};
