"use strict";

const Service = require("egg").Service;

class AuthService extends Service {
	/**
	 * @description 生成Token
	 * @author bubao
	 * @date 2021-11-15 14:11:07
	 * @param {*} {
	 * 		accessTokenKey,
	 * 		refreshTokenKey,
	 * 		payload = {},
	 * 		accessTokenTimeout = 60 * 60 * 2,
	 * 		refreshTokeTimeout = 60 * 60 * 24 * 30
	 * 	}
	 * @return {Promise<{access_token,refresh_token}>} token
	 * @memberof AuthService
	 */
	async generateToken({
		accessTokenKey,
		refreshTokenKey,
		payload = {},
		data = {},
		accessTokenTimeout = 60 * 60 * 2,
		refreshTokeTimeout = 60 * 60 * 24 * 30
	}) {
		const { ctx, app } = this;
		const token = {};
		// * accessTokenKey 存在，则生成accessToken
		if (accessTokenKey) {
			const access_token = await ctx.helper.generateToken(payload, accessTokenTimeout);
			token.access_token = access_token.access_token;
			await app.redis.set(accessTokenKey, JSON.stringify({ ...data, token: token.access_token }), "EX", accessTokenTimeout);
		}
		if (refreshTokenKey) {
			const refresh_token = await ctx.helper.generateToken(payload, refreshTokeTimeout);
			token.refresh_token = refresh_token.access_token;
			await app.redis.set(refreshTokenKey, JSON.stringify({ ...data, token: token.refresh_token }), "EX", refreshTokeTimeout);
		}
		return token;
	}
}

module.exports = AuthService;
