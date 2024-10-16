/* eslint-disable no-console */
/**
 * A simple logger.
*/
export class Logger {

  /**
   * Log a message.
   * @param args Things to log.
   */
  public log (...args: unknown[]): void {
    console.log(...args);
  }

  /**
   * Log a message prepended with `[Debug]`.
   * The message will only be logged if `process.env.DEBUG` is a truthy value.
   * @param args Things to log.
   */
  public debug (...args: unknown[]): void {
    if (!process.env.DEBUG) {
      return;
    }
    console.log('[Debug]', ...args);
  }

  /**
   * Log a message prepended with `[Info]`.
   * @param args Things to log.
   */
  public info (...args: unknown[]): void {
    console.log('[Info]', ...args);
  }

  /**
   * Log an error message prepended with `[Warn]`.
   * @param args Things to log.
   */
  public warn (...args: unknown[]): void {
    console.warn('[Warn]', ...args);
  }

  /**
   * Log an error message prepended with `[Error]`.
   * @param args Things to log.
   */
  public error (...args: unknown[]): void {
    console.error('[Error]', ...args);
  }
}
