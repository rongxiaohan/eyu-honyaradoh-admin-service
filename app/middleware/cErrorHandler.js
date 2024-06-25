/**
 * @Description: 错误捕捉
 * @Author: chenchen
 * @Date: 2021-02-20 16:36:41
 * @LastEditors: bubao
 * @LastEditTime: 2023-11-15 15:02:38
 */
"use strict";
module.exports = () => {
	return async function(ctx, next) {
		if (ctx.app.running === false) {
			return ctx.helper.handleFail(4000);
		}
		try {
			await next();
		} catch (err) {
			if (err.errcode) {
				const { errmsg } = ctx.helper.errcode[err.errcode];
				if (errmsg) {
					err.errmsg = err.error || errmsg;
				}
			} else {
				console.log("err", err);
				err.errcode = 40000;
				err.errmsg = "操作失败";
			}
			ctx.helper.logToRemote("error", err);
			ctx.helper.handleFail(err.errcode, { errmsg: err.errmsg, ...err.res });
		}
	};
};
