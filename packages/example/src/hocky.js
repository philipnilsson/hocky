import React, { Component } from 'react';
import debounceFn from 'lodash/debounce';
import shallowCompare from 'react-addons-shallow-compare';

export default function hocky(f) {
  return () => f().run();
}

export class HOC {
  
  constructor(run) {
    this._run = run;
  }
  
  run(f = x => x) {
    return this._run(f);
  }
  
  chain(f) {
    return new HOC(consumer => {
      return this.run(val => f(val).run(consumer))
    });
  }
}

export const pure = a => new HOC(consumer => consumer(a));

// ECHO

class Echo extends Component {
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

export const echo = value => new HOC(consumer => {
  return <Echo value={value}>{consumer}</Echo>;
});

// TOGGLE

class Toggle extends Component {
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
    return this.props.children({
      checked: this.state.checked,
      bind: { ...this.bind, checked: this.state.checked }
    });
  }
}

export const toggle = checked => new HOC(
  consumer => <Toggle checked={checked}>{consumer}</Toggle>
);

// DELAY

class Delay extends React.Component {

  state = {
    value: this.props.value
  }
  
  componentWillReceiveProps({ value }) {
    setTimeout(() => this.setState({ value }), this.props.delay);
  }
  
  render() {
    return this.props.children(this.state.value);
  }
}

export const delay = (value, dt) => new HOC(
  consumer => <Delay delay={dt} value={value}>{consumer}</Delay>
);

// DEBOUNCE

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

export const debounce = (value, dt) => new HOC(
  consumer => <Debounce debounce={dt} value={value}>{consumer}</Debounce>
);

// LOAD

const encodeUrl = ({ url, query }) => {
  if (!query) return url;
  return url + '?' + Object.keys(query).map(
    k => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`
  ).join('&');
}

class Load extends Component {
  
  state = {
    loading: true,
    result: null
  }
  
  componentWillMount() {
    this.fetch(this.props);
  }
  
  componentWillUpdate(props) {
    if (encodeUrl(props) !== encodeUrl(this.props)) {
      this.fetch(props);
    }
  }

  componentWillUnmount() {
    this.current = null;
  }
  
  shouldComponentUpdate(props, state) {
    return this.state.loading !== state.loading ||
           this.state.result !== state.result ||
           this.props.children !== props.children;
  }
  
  fetch(props) {
    this.setState({ loading: true });
    const current = this.current = fetch(encodeUrl(props))
      .then(x => x.json())
      .then(result => {
        if (current === this.current) {
          this.setState({ result, loading: false });
        }
      });
  }

  render() {
    return this.props.children({ ...this.state });
  }
}

export const load = (url, query) => new HOC(
  consumer => <Load url={url} query={query}>{consumer}</Load>
);
