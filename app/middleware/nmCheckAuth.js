/**
 * @Description: 后台管理系统授权检查中间件
 * @Author: chenchen
 * @Date: 2021-04-02 10:30:32
 * @LastEditors: bubao
 * @LastEditTime: 2023-11-15 10:01:50
 */
"use strict";
/**
 * @description 授权检查中间件
 * @author bubao
 * @date 2022-05-10 16:05:35
 * @param {string} [RoleList=["r", "A", "R"]] 权限 r: root A: admin R: report
 * @return {Promise<Function>} 中间件方法
 */
function nmCheckAuth(RoleList = ["r", "A", "R"]) {
	return async (ctx, next) => {
		const encrytedToken = ctx.get("Authorization");
		if (
			encrytedToken === "undefined" ||
			encrytedToken === "null" ||
			encrytedToken === "" ||
			encrytedToken === undefined
		) {
			ctx.throw(400, { errcode: 50001, error: "未传入token" });
			// return ctx.helper.handleFail({ statusCode: 40001 });
		}
		// 解密token
		const token = encrytedToken;
		// const token = ctx.helper.decrypteToken(encrytedToken);
		// 验证token
		await ctx.helper.verifyToken(token, "2");
		// 解析token
		const decodeData = ctx.helper.decodeToken(token);
		const redisLockPrefix = await ctx.app.config.redisLockPrefix;
		// 检查redis
		let AccessToken = await ctx.app.redis.get(`${redisLockPrefix}#nm#access_token#${decodeData.role}#${decodeData.id}`);

		if (RoleList.length && !RoleList.includes(decodeData.role)) {
			ctx.throw(422, {
				errcode: 50004
			});
		}
		if (!AccessToken) {
			ctx.throw(422, {
				errcode: 50003
			});
		}
		AccessToken = JSON.parse(AccessToken);
		let isUserExist = false;
		if (AccessToken.token !== encrytedToken) {
			ctx.throw(422, {
				errcode: 50004
			});
		}
		isUserExist = await ctx.model.NmUsers.findByPk(decodeData.id);
		// console.log("decodeData", !isUserExist);

		// 用户不存在抛出
		if (!isUserExist) {
			ctx.throw(422, {
				errcode: 50004
			});
		}
		ctx.nmJwtDecodeData = {
			...decodeData
		};
		await next();
	};
}

module.exports = nmCheckAuth;
