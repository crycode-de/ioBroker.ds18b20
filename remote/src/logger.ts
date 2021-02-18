/**
 * A simple logger.
 */
export class Logger {

  /**
   * Log a message.
   * @param args Things to log.
   */
  public log (...args: any[]): void {
    console.log(...args);
  }

  /**
   * Log a message prepended with `[Debug]`.
   * The message will only be logged if `process.env.DEBUG` is a truthy value.
   * @param args Things to log.
   */
  public debug (...args: any[]): void {
    if (!process.env.DEBUG) {
      return;
    }
    console.log('[Debug]', ...args);
  }

  /**
   * Log a message prepended with `[Info]`.
   * @param args Things to log.
   */
  public info (...args: any[]): void {
    console.log('[Info]', ...args);
  }

  /**
   * Log an error message prepended with `[Warn]`.
   * @param args Things to log.
   */
  public warn (...args: any[]): void {
    console.warn('[Warn]', ...args);
  }


  /**
   * Log an error message prepended with `[Error]`.
   * @param args Things to log.
   */
  public error (...args: any[]): void {
    console.error('[Error]', ...args);
  }
}
