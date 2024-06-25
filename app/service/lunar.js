/**
 * @Description:
 * @Author: bubao
 * @Date: 2023-11-15 12:26:25
 * @LastEditors: bubao
 * @LastEditTime: 2023-11-16 18:23:58
 */
"use strict";

const Service = require("egg").Service;
const lunisolar = require("lunisolar");
class LunarService extends Service {
	lunarInfo(date) {
		const d = lunisolar(date);
		const lunar_calendar = d.format("lY年 lMlD") || "";
		const solar_term = lunisolar(date).solarTerm?.toString() || "";
		const lunar_festival = "";
		// solar_term     String? /// 农历节气
		// lunar_calendar String? /// 农历
		// lunar_festival String? /// 农历节日
		return {
			lunar_calendar,
			solar_term,
			lunar_festival
		};
	}
}

module.exports = LunarService;
