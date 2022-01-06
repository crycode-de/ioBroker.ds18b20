"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.round = void 0;
function round(num, precision) {
    if (precision == 0)
        return Math.round(num);
    let exp = 1;
    for (let i = 0; i < precision; i++) {
        exp *= 10;
    }
    return Math.round(num * exp) / exp;
}
exports.round = round;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9vbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvbGliL3Rvb2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQU1BLFNBQWdCLEtBQUssQ0FBRSxHQUFXLEVBQUUsU0FBaUI7SUFDbkQsSUFBRyxTQUFTLElBQUksQ0FBQztRQUFFLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUUxQyxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDWixLQUFJLElBQUksQ0FBQyxHQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsU0FBUyxFQUFFLENBQUMsRUFBRSxFQUFFO1FBQy9CLEdBQUcsSUFBSSxFQUFFLENBQUM7S0FDWDtJQUVELE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDO0FBQ3JDLENBQUM7QUFURCxzQkFTQyJ9