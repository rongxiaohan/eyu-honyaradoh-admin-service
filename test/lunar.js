/* eslint-disable no-undef */
/*
 * @Description:
 * @Author: bubao
 * @Date: 2023-11-15 13:11:07
 * @LastEditors: bubao
 * @LastEditTime: 2023-11-15 13:14:08
 */
const lunisolar = require("lunisolar");

function getLunarInfo(date) {
	const d = lunisolar(date);
	const lunar_calendar = d.format("lY年 lMlD");
	/* eslint-disable */

	const solar_term = lunisolar(date).solarTerm?.toString();
	/* eslint-enable */
	console.log(solar_term);
	console.log(lunar_calendar);
	// solar_term     String? /// 农历节气
	// lunar_calendar String? /// 农历
	// lunar_festival String? /// 农历节日
}
getLunarInfo("2023-11-16");

