import React from 'react';
import ReactDOM from 'react-dom';
import hocky, { pure, echo, toggle, load, delay, debounce, interval, window, timeWindow, filter } from 'hocky';

const Test = hocky(function*() {
  const name = yield echo('World!');
  const checkbox = yield toggle(true);
  const debouncedName = yield debounce(name.value, 500);  
  const isStale = name.value !== debouncedName;
  const delayInput = yield echo('1');
  const dt = parseFloat(delayInput.value, 10);
  const time = yield interval(1000);
  
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

  const history =
    yield timeWindow(name.value, 1000);
  
  return (
    <div>
        <input {...name.bind} />
        <input { ...checkbox.bind} />
        <div>
            <label>Delay:</label>
            <input { ...delayInput.bind} />
        </div>
        <h1>
            Hello, {yield filter(yield delay(name.value, dt * 1000), time > 4)}
        </h1>
        <span>
            Checkbox is {!checkbox.checked && <b>not</b>} checked.
        </span>
        <div>
            You've been here for {time}s.
        </div>
        <hr/>
        <div>
            {links}
        </div>
        <div>
            <h3>Search History</h3>
            {history.map((h, ix) => <div key={ix}>{h}</div>)}
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
