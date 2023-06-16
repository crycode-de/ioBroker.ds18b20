import * as crypto from 'crypto';

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

/**
 * Create a random hex string.
 * @param len Length of the string to generate. Should be a multiple of 2.
 */
export function genHexString (len: number): string {
  const bytes = crypto.randomBytes(len / 2);
  return [...bytes]
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
}
