export function debounce (callback, delay = 1000) {
  let timeout
  
  return function (...arg) {
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      callback(...arg)
    }, delay)
  }
}