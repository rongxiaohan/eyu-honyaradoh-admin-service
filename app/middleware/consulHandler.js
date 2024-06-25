/**
 * @Description: consul服务检测相关
 * @Author: chenchen
 * @Date: 2021-02-20 16:37:10
 * @LastEditors: bubao
 * @LastEditTime: 2021-07-19 11:09:41
 */
"use strict";
module.exports = () => {
	return async (ctx, next) => {
		const url = ctx.request.url;
		// const methods = ctx.request.method;
		// 健康检测
		if (url === "/consul/check") {
			ctx.body = "OK";
			return;
		}
		await next();
	};
};
