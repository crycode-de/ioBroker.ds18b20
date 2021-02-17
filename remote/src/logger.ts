export class Logger {

  public debug(...args: any[]): void {
    if (!process.env.DEBUG) {
      return;
    }
    console.log('[Debug]', ...args);
  }

  public info(...args: any[]): void {
    console.log('[Info]', ...args);
  }

  public warn(...args: any[]): void {
    console.warn('[Warn]', ...args);
  }

  public error(...args: any[]): void {
    console.error('[Error]', ...args);
  }
}