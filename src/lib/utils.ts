/**
 * Round a floating point number to the given precision.
 * @param num       The number.
 * @param precision The number of decimals to round to.
 * @return          The rounded number.
 */
export function round (num: number, precision: number): number {
  if(precision == 0) return Math.round(num);

  let exp = 1;
  for(let i=0; i < precision; i++) {
    exp *= 10;
  }

  return Math.round(num * exp) / exp;
}
