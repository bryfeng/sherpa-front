export const getFlag = (key: string) => {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

export const setFlag = (key: string, value: boolean) => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value ? '1' : '0')
    }
  } catch {
    // ignore storage write failures
  }
}
