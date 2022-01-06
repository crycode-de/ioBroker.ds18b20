"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
class Logger {
    log(...args) {
        console.log(...args);
    }
    debug(...args) {
        if (!process.env.DEBUG) {
            return;
        }
        console.log('[Debug]', ...args);
    }
    info(...args) {
        console.log('[Info]', ...args);
    }
    warn(...args) {
        console.warn('[Warn]', ...args);
    }
    error(...args) {
        console.error('[Error]', ...args);
    }
}
exports.Logger = Logger;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL3JlbW90ZS9sb2dnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBR0EsTUFBYSxNQUFNO0lBTVYsR0FBRyxDQUFFLEdBQUcsSUFBVztRQUN4QixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDdkIsQ0FBQztJQU9NLEtBQUssQ0FBRSxHQUFHLElBQVc7UUFDMUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFO1lBQ3RCLE9BQU87U0FDUjtRQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDbEMsQ0FBQztJQU1NLElBQUksQ0FBRSxHQUFHLElBQVc7UUFDekIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUNqQyxDQUFDO0lBTU0sSUFBSSxDQUFFLEdBQUcsSUFBVztRQUN6QixPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFPTSxLQUFLLENBQUUsR0FBRyxJQUFXO1FBQzFCLE9BQU8sQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDcEMsQ0FBQztDQUNGO0FBOUNELHdCQThDQyJ9