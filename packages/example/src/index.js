import React from 'react';
import ReactDOM from 'react-dom';
import hocky, { pure, echo, toggle, load, delay, debounce, interval, window, updateWhen } from 'hocky';

const Test = hocky(function*() {

  const name = yield echo('World!');
  const awesome = yield toggle(true);
  const debouncedName = yield debounce(name.value, 500);  
  const isStale = name.value !== debouncedName;
  const delayInput = yield echo('1');
  const dt = parseInt(delayInput.value, 10) || 1;
  
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
    );

  return (
    <div>
        <input {...name.bind} />
        <input { ...awesome.bind} />
        <label> Delay: <input { ...delayInput.bind} /></label>
        <h1>
            Hello, {yield delay(name.value, 1000)}
        </h1>
        <span>
            Checkbox is {!awesome.checked && <b>not</b>} checked.
        </span>
        <div>
            You've been here for {yield interval(dt * 1000)}s.
        </div>
        <hr/>
        {links}
        <div>
            <h3>History</h3>
            {(yield window(debouncedName, 3)).map((h, ix) => <div key={ix}>{h}</div>)}
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
