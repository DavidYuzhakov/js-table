const compose = function(fn) {
  if (fn.length < 1) {
    return function (x) { return x }
  }

  return fn.reduceRight((prevFn, nextFn) => {
    return function (x) {
      return nextFn(prevFn(x))
    }
  })
}

const fn = compose([x => x + 1, x => 2 * x])
fn(4) // 9
