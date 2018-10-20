import React from 'react';
import ReactDOM from 'react-dom';
import hocky, { pure, echo, toggle, load, delay, debounce } from 'hocky';

const Test = hocky(function*() {

  const name = yield echo('World!');
  const awesome = yield toggle(true);
  const debouncedName = yield debounce(name.value, 500);  
  const isStale = name.value !== debouncedName;
  
  const { loading, result } = yield load(
    'https://en.wikipedia.org/w/api.php', {
      action: 'opensearch',
      search: debouncedName,
      origin: '*'
    }
  );
  
  const links =
    !loading && !isStale && result[3].map(decodeURI).map((link, ix) =>
      <div key={ix}>
          <a href={link}>{link}</a>
      </div>
    )
  
  return (
    <div>
        <input {...name.bind} />
        <input { ...awesome.bind} />
        <h1>
            Hello, {yield delay(name.value, 2000)}
        </h1>
        <span>
            You are {!awesome.checked && <b>not</b>} awesome
        </span>
        <hr/>
        <div>
            {links}
        </div>
    </div>
  );
});

document.addEventListener('DOMContentLoaded', () => {
  ReactDOM.render(
    <Test />,
    document.getElementById('index')
  );
});
