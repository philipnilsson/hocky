import React from 'react';
import HOC from './hoc';

const encodeUrl = ({ url, query }) => {
  if (!query) return url;
  return url + '?' + Object.keys(query).map(
    k => `${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`
  ).join('&');
}

class Load extends React.Component {
  
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

export default function load(url, query) {
  return new HOC(
    consumer => <Load url={url} query={query}>{consumer}</Load>
  )
};
