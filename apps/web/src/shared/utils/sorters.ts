export function stringSorter<T, K extends keyof T = keyof T>(field: K, dir: 'asc' | 'desc' = 'asc') {
  return (a: T, b: T) => {
    const strA = String(a[field]) ?? '';
    const strB = String(b[field]) ?? '';

    return dir === 'asc' ? strB.localeCompare(strA) : strA.localeCompare(strB);
  };
}

export function numericSorter<T, K extends keyof T>(field: K, dir: 'asc' | 'desc' = 'asc') {
  return (a: T, b: T) => {
    const numA = Number(a[field]) ?? NaN;
    const numB = Number(b[field]) ?? NaN;

    return dir === 'asc' ? numB - numA : numA - numB;
  };
}
