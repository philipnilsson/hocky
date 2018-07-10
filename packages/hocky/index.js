import { pure } from '../plugin/test/cont';

const x = function* foo() {
  yield pure(100);
  yield pure(200);
  yield pure(30);
  return 20;
}
