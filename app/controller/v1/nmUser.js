/**
 * @Description:
 * @author: bubao
 * @Date: 2021-10-29 10:57:33
 * @LastEditors: bubao
 * @LastEditTime: 2023-11-16 17:26:24
 */
"use strict";

const Controller = require("egg").Controller;
// const fs = require("fs");
const moment = require("moment");
const util = require("util");
const path = require("path");
// const fsStat = util.promisify(fs.stat);
const Exec = util.promisify(require("child_process").exec);
const _ = require("lodash");
const svgCaptcha = require("svg-captcha");
const { v4: uuidV4 } = require("uuid");

class NmUserController extends Controller {
	/**
   * @description 登录
   * @author bubao
   * @Router post /api/nm/v1/login/email
   * @param(Object) username password
   * @date 2021-10-29 11:10:19
   * @memberof UserController
   */
	async loginByEmail() {
		const { ctx, app } = this;
		// * 检验参数
		try {
			ctx.validate({
				email: { type: "email" },
				captcha: { type: "id" },
				svg_captcha_id: { type: "string" },
				svg_captcha_text: { type: "string" }
			}, ctx.request.body);
		} catch (error) {
			return ctx.throw(403, { errcode: 40001, res: { field: error.errors } });
		}

		const { email, captcha, svg_captcha_id, svg_captcha_text } = ctx.request.body;


		const userInfo = await ctx.model.NmUsers.findOne({
			where: { email },
			raw: true
		});

		if (!userInfo) {
			// * 用户不存在
			ctx.throw(400, { errcode: 40002 });
		}
		if (userInfo.status === 0) {
			// * 用户已被停用
			ctx.throw(400, { errcode: 40024 });
		}
		const redisLockPrefix = app.config.redisLockPrefix;
		const CaptchaKey = `${redisLockPrefix}#captcha#${svg_captcha_id}`;
		const svgCaptchaText = await app.redis.get(CaptchaKey);
		if (svg_captcha_text !== svgCaptchaText) {
			return ctx.throw(403, { errcode: 40046 });
		}
		// * 检查 redis 中是否存在邮箱和验证码
		const redisCaptcha = await app.redis.get(`${redisLockPrefix}#login#${email}`);
		const redisCaptchaTimes = app.redis.get(`${redisLockPrefix}#login#${email}#times`);
		if (!redisCaptcha) {
			// 验证码无效
			await app.redis.del(`${redisLockPrefix}#login#${email}#times`);
			return ctx.throw(403, { errcode: 40017 });
		}

		if (redisCaptcha !== captcha) {
			// 验证码错误
			// * 多次尝试则删除验证码
			if ((redisCaptchaTimes - 0) < 5) {
				await app.redis.incr(`${redisLockPrefix}#login#${email}#times`);
			} else {
				await app.redis.set(`${redisLockPrefix}#login#${email}`, "del");
			}
			return ctx.throw(403, { errcode: 40016 });
		}
		// * 签发token

		const token = await ctx.service.auth.generateToken({
			accessTokenKey: `${redisLockPrefix}#nm#access_token#${userInfo.role}#${userInfo.id}`,
			refreshTokenKey: `${redisLockPrefix}#nm#refresh_token#${userInfo.role}#${userInfo.id}`,
			payload: {
				// type: "nm", // 区分token的使用范围 nm是后台管理系统，mp是小程序
				// username: userInfo.username,
				role: userInfo.role,
				id: userInfo.id
			},
			data: {
				id: userInfo.id,
				type: "nm", // 区分token的使用范围 nm是后台管理系统，mp是小程序
				username: userInfo.username,
				role: userInfo.role
			}
		});

		// 删除redis中的验证码
		await app.redis.del(`${redisLockPrefix}#login#${email}`);
		ctx.helper.handleSuccess({
			info: {
				id: userInfo.id,
				username: userInfo.username,
				role: userInfo.role,
				nickname: userInfo.nicknam,
				head_portrait: userInfo.head_portrait
			},
			token
		});
	}

	/**
	 * @description 发送邮箱验证码用于登录
	 * @author bubao
	 * @Router post /api/nm/v1/captcha
	 * @date 2021-11-15 11:11:49
	 * @memberof NmUserController
	 */
	async sendMailToLogin() {
		const { ctx, app } = this;
		// * 检验参数
		try {
			ctx.validate({
				email: { type: "email" }
			}, ctx.request.body);
		} catch (error) {
			return ctx.throw(403, { errcode: 40001, res: { field: error.errors } });
		}
		const email = ctx.request.body.email;
		const redisLockPrefix = app.config.redisLockPrefix;
		// * 检查用户是否存在数据库
		const User = await ctx.model.NmUsers.findOne({
			attributes: ["id", "status"],
			where: {
				email
			},
			raw: true
		});
		if (!User) {
			ctx.throw(401, { errcode: 40002 });
		}
		if (User.status === 0) {
			ctx.throw(400, { errcode: 40024 });
		}
		const Minutes = 5;
		// * 一分钟拦截锁
		const ttlTime = await app.redis.ttl(`${redisLockPrefix}#login#${email}`);
		if (moment().add(ttlTime, "s") > moment().add(60 * (Minutes - 1), "s")) {
			ctx.throw(401, { errcode: 40020 });
		}
		// * 发送邮件
		let code = "";
		for (let index = 0; index < 6; index++) {
			code += _.random(0, 9, false);
		}

		await ctx.service.email.sendMail({
			toEmail: email,
			subject: "后台登录验证码",
			contents: `您的登录验证码是：${code}，有效期为${Minutes}分钟，${moment().add(5, "m").format("YYYY-MM-DD HH:mm:ss")}过期`
		}).catch(() => {
			ctx.throw(400, { errcode: 40021 });
		});
		await app.redis.set(`${redisLockPrefix}#login#${email}`, code, "EX", 60 * Minutes);
		await app.redis.incrby(`${redisLockPrefix}#login#${email}#times`, 1);
		await app.redis.expire(`${redisLockPrefix}#login#${email}#times`, 60 * Minutes);

		ctx.helper.handleSuccess();
	}

	/**
	 * @description 发送图形验证码
	 * @author bubao
	 * @date 2023-11-15 09:11:49
	 * @memberof NmUserController
	 */
	async sendCaptchaToLogin() {
		const { ctx, app } = this;
		const captcha = svgCaptcha.create({
			height: 40,
			width: 120
		});
		const redisLockPrefix = app.config.redisLockPrefix;
		const uuid = uuidV4();
		const Minutes = 5;
		const { data, text } = captcha;
		const CaptchaKey = `${redisLockPrefix}#captcha#${uuid}`;
		await app.redis.set(CaptchaKey, text, "Ex", 60 * Minutes);
		ctx.helper.handleSuccess({
			svg_captcha: data,
			svg_captcha_id: uuid
		});
	}
	/**
	   * @description 刷新token
	   * @author bubao
	   * @Router put /api/nm/v1/reauth
	   * @param(refresh_token) 刷新token
	   * @Response 400 { errcode, errmsg }
	   * @date 2021-11-03 16:11:16
	   * @memberof NewsController
	   */
	async refreshToken() {
		const { ctx, app } = this;
		// * 检查参数
		try {
			ctx.validate({
				refresh_token: { type: "string" }
			}, ctx.request.body);
		} catch (error) {
			return ctx.throw(403, { errcode: 40001, res: { field: error.errors } });
		}
		const redisLockPrefix = app.config.redisLockPrefix;
		// const { id, role } = ctx.nmJwtDecodeData;
		await ctx.helper.verifyToken(ctx.request.body.refresh_token);
		const token = ctx.helper.decodeToken(ctx.request.body.refresh_token);
		const { id, role } = token;
		// TODO 检查Redis中是否存在
		let refresh_token = await app.redis.get(`${redisLockPrefix}#nm#refresh_token#${role}#${id}`);
		const UserInfo = await ctx.model.NmUsers.findOne({ where: { id, role }, raw: true });

		// console.log("refresh_token1", refresh_token);
		if (!refresh_token) {
			ctx.throw(403, { errcode: 40023 });
		}
		refresh_token = JSON.parse(refresh_token);
		// console.log("refresh_token2", refresh_token.token, ctx.get("Authorization"));
		if (refresh_token.token === ctx.request.body.refresh_token && UserInfo) {
			const token = await ctx.service.auth.generateToken({
				accessTokenKey: `${redisLockPrefix}#nm#access_token#${role}#${id}`,
				refreshTokenKey: `${redisLockPrefix}#nm#refresh_token#${role}#${id}`,
				payload: {
					id,
					// type: "nm", // 区分token的使用范围 nm是后台管理系统，mp是小程序
					// username: UserInfo.username,
					role
				},
				data: {
					id,
					type: "nm", // 区分token的使用范围 nm是后台管理系统，mp是小程序
					username: UserInfo.username,
					role
				}
			});

			// 删除redis中的验证码
			ctx.helper.handleSuccess({
				token
			});
		} else {
			ctx.throw(403, { errcode: 40023 });
		}
		// await ctx.service.user.refreshToken(ctx.request.body.refresh_token);
	}

	/**
	   * @description 安全退出
	   * @author bubao
	   * @Router /api/nm/v1/logout
	   * @Response 400 { errcode, errmsg }
	   * @date 2021-11-04 12:11:14
	   * @memberof UserController
	   */
	async logout() {
		const { ctx, app } = this;
		// const { id, role } = ctx.nmJwtDecodeData;
		// * 解析token
		const encrytedToken = ctx.get("Authorization");
		if (!encrytedToken) {
			return ctx.helper.handleSuccess();
		}
		let decodeData;
		try {
			await ctx.helper.verifyToken(encrytedToken);
			decodeData = ctx.helper.decodeToken(encrytedToken);
		} catch (error) {
			return ctx.helper.handleSuccess();
		}
		// * 获取id和role
		const redisLockPrefix = app.config.redisLockPrefix;
		const { id, role } = decodeData;
		// * 检查redis
		const authToken = await app.redis.get(`${redisLockPrefix}#nm#access_token#${role}#${id}`);
		if (authToken === ctx.get("Authorization")) {
			// * 检查通过删除redis
			app.redis.del(`${redisLockPrefix}#nm#refresh_token#${role}#${id}`);
			app.redis.del(`${redisLockPrefix}#nm#access_token#${role}#${id}`);
			ctx.helper.handleSuccess();

		} else {
			ctx.helper.handleSuccess();
		}
	}

	/**
	 * @description 获取用户列表
	 * @author bubao
	 * @Router get /api/nm/v1/user/list
	 * @date 2021-11-15 16:11:51
	 * @return {*} 空
	 * @memberof NmUserController
	 */
	async getNmUsersList() {
		const { ctx, app } = this;
		// * 检验参数
		try {
			ctx.request.query.size = ctx.request.query.size ? ctx.request.query.size - 0 : undefined;
			ctx.request.query.page = ctx.request.query.page ? ctx.request.query.page - 0 : undefined;
			ctx.validate({
				role: { type: "enum", required: false, values: ["R", "r", "A", ""] },
				size: { type: "number", required: false, min: 1 },
				page: { type: "number", required: false, min: 1 },
				status: { type: "enum", required: false, values: ["0", "1", ""] },
				username: { type: "string", required: false }
			}, ctx.request.query);
		} catch (error) {
			return ctx.throw(403, { errcode: 40001, res: { field: error.errors } });
		}

		let { page = 1, size = 10, role = false, status, username } = ctx.request.query;
		size = size - 0;
		page = ((page - 0) - 1) * (size);
		const query = {
			attributes: ["id", "username", "role", "head_portrait", "email", "created_at", "created_by", "updated_at", "updated_by", "status"],
			include: [{ attributes: ["username"], model: ctx.model.NmUsers, as: "createdBy" }, { attributes: ["username"], model: ctx.model.NmUsers, as: "updatedBy" }],
			// raw: true,
			limit: size,
			offset: page
		};
		const Op = app.Sequelize.Op;
		query.where = {};
		// 权限控制
		switch (ctx.nmJwtDecodeData.role) {
			case "r":
				if (role && role !== "") {
					query.where.role = role;
				}
				break;
			case "A":
				if (role && role !== "r" && role !== "") {
					query.where.role = role;
				} else if (role === "r") {
					ctx.throw(400, { errcode: 40023 });
				}
				break;
			default:
				break;
		}
		if (status !== "" && status !== undefined) query.where.status = status - 0;
		if (username !== undefined && username !== "") query.where.username = { [Op.like]: `%${username}%` };
		const List = await ctx.model.NmUsers.findAndCountAll(query);

		ctx.helper.handleSuccess(List);
	}

	/**
	   * @description 创建用户
	   * @author bubao
	   * @Router post /api/user/create
	   * @date 2021-11-09 13:11:21
	   * @memberof UserController
	   */
	async createUser() {
		const { ctx } = this;
		// * 检查参数
		try {
			ctx.validate({
				email: { type: "email" },
				head_portrait: { type: "string" },
				role: { type: "enum", values: ["R", "A", "r"] },
				username: { type: "string" }
			}, ctx.request.body);
		} catch (error) {
			return ctx.throw(403, { errcode: 40001, res: { field: error.errors } });
		}

		const { email, role } = ctx.request.body;
		if (role === "r" && ctx.nmJwtDecodeData.role === "A") {
			// * A 不允许创建 r 帐号
			ctx.throw(403, { errcode: 40023 });
		}
		// * 检查数据库邮箱是否重复
		const findUser = await ctx.model.NmUsers.findOne({
			raw: true,
			attributes: ["id"],
			where: {
				email
			}
		});
		if (findUser) {
			// * 用户已存在
			ctx.throw(400, { errcode: 40022 });
		}
		// * 保存数据库
		await ctx.model.NmUsers.create({
			...ctx.request.body,
			id: uuidV4(),
			created_by: ctx.nmJwtDecodeData.id,
			updated_by: ctx.nmJwtDecodeData.id
		});
		const UserInfo = await ctx.model.NmUsers.findOne({
			raw: true,
			attributes: ["id", "username", "role", "head_portrait", "email"],
			where: {
				email
			}
		});
		// * 返回
		ctx.helper.handleSuccess(UserInfo);
	}

	/**
	 * @description 根据用户id获取用户信息。
	 * @author bubao
	 * @Router get /api/nm/v1/user/info
	 * @date 2021-11-16 15:11:13
	 * @memberof NmUserController
	 */
	async getNmUserByUserId() {
		const { ctx } = this;
		// * 检验参数
		try {
			ctx.validate({
				id: { type: "string" }
			}, ctx.request.query);
		} catch (error) {
			return ctx.throw(403, { errcode: 40001, res: { field: error.errors } });
		}
		// 判断是否有权限获取id的资料
		const UserInfo = await ctx.model.NmUsers.findOne({
			raw: true,
			attributes: ["id", "username", "role", "head_portrait", "email", "created_at", "created_by", "updated_at", "updated_by", "status"],
			include: [{ attributes: ["username"], model: ctx.model.NmUsers, as: "createdBy" }, { attributes: ["username"], model: ctx.model.NmUsers, as: "updatedBy" }],
			where: {
				id: ctx.request.query.id
			}
		});
		if (!UserInfo) {
			ctx.throw(403, { errcode: 40002 });
		}
		if (UserInfo.role === "r" && ctx.nmJwtDecodeData.role === "A") {
			ctx.throw(403, { errcode: 40023 });
		}
		ctx.helper.handleSuccess(UserInfo);
	}

	/**
	 * @description 根据id修改的用户信息
	 * @author bubao
	 * @Router PUT /api/nm/v1/user
	 * @date 2021-11-16 15:11:26
	 * @memberof NmUserController
	 */
	async updateNmUserInfoById() {
		const { ctx, app } = this;
		// * 检验参数
		try {
			ctx.validate({
				id: { type: "string" },
				email: { type: "email" },
				head_portrait: { type: "string" },
				role: { type: "enum", values: ["R", "A", "r"] },
				username: { type: "string" }
			}, ctx.request.body);
		} catch (error) {
			return ctx.throw(403, { errcode: 40001, res: { field: error.errors } });
		}
		const redisLockPrefix = app.config.redisLockPrefix;
		const { id, email, head_portrait, role, username } = ctx.request.body;
		if (ctx.nmJwtDecodeData.role === "A" && role === "r") {
			// * A 不允许更改 r 帐号
			ctx.throw(403, { errcode: 40023 });
		}
		// * 获取被修改者的头像，做对比，如果有改变且为本地资源则删除原来的头像
		const OlderUserInfo = await ctx.model.NmUsers.findOne({
			attributes: ["head_portrait", "role"],
			where: { id },
			raw: true
		});
		// * 如果邮箱已经存在并且用户id不是被更改的的用户，不允许修改
		const OlderUserInfoByEmail = await ctx.model.NmUsers.findOne({
			attributes: ["id"],
			where: { email },
			raw: true
		});
		if (OlderUserInfoByEmail && OlderUserInfoByEmail.id !== id) {
			ctx.throw(400, { errcode: 40022 });
		}
		if (!OlderUserInfo) {
			// * 用户不存在
			ctx.throw(403, { errcode: 40002 });
		}
		if (OlderUserInfo.head_portrait !== head_portrait && OlderUserInfo.head_portrait.indexOf(app.config.hostname) === 0) {
			// * 删除旧头像文件
			Exec("rm " + path.join(app.config.private.sourceBaseDirPath, OlderUserInfo.head_portrait.replace(app.config.hostname, ""))).catch(() => {
				ctx.helper.logToRemote("error", "rm " + path.join(app.config.private.sourceBaseDirPath, OlderUserInfo.head_portrait.replace(app.config.hostname, "")) + ` 失败\nid:${ctx.nmJwtDecodeData.id}`);
			});
		}
		// * 更新数据
		await ctx.model.NmUsers.update({ email, head_portrait, role, username, updated_by: ctx.nmJwtDecodeData.id },
			{
				where: {
					id
				}
			}
		);
		// * 删除 被修改者的 token
		await app.redis.del(`${redisLockPrefix}#nm#refresh_token#${OlderUserInfo.role}#${id}`);
		await app.redis.del(`${redisLockPrefix}#nm#access_token#${OlderUserInfo.role}#${id}`);
		// * 返回最新的数据
		const UserInfo = await ctx.model.NmUsers.findOne({
			attributes: ["id", "username", "role", "head_portrait", "email", "created_at", "created_by", "updated_at", "updated_by", "status"],
			where: { id },
			raw: true
		});
		ctx.helper.handleSuccess(UserInfo);
	}

	/**
	 * @description 根据id更新用户状态
	 * @author bubao
	 * @date 2021-11-16 16:11:32
	 * @return {any} 空
	 * @memberof NmUserController
	 */
	async updateNmUserStatusById() {
		const { ctx, app } = this;
		// * 检验参数
		try {
			ctx.validate({
				id: { type: "string" },
				status: { type: "enum", required: false, values: [0, 1] }
			}, ctx.request.body);
		} catch (error) {
			return ctx.throw(403, { errcode: 40001, res: { field: error.errors } });
		}
		const redisLockPrefix = app.config.redisLockPrefix;
		const { id, status } = ctx.request.body;
		const UserInfo = await ctx.model.NmUsers.findOne({
			attributes: ["role", "id"],
			where: {
				id
			},
			raw: true
		});
		if (!UserInfo) {
			ctx.throw(403, { errcode: 40002 });
		}
		if (ctx.nmJwtDecodeData.role === "A" && UserInfo.role === "r") {
			// * A 不允许更改 r 帐号
			ctx.throw(403, { errcode: 40023 });
		}
		await ctx.model.NmUsers.update({
			status,
			updated_by: ctx.nmJwtDecodeData.id
		}, {
			where: {
				id
			}
		});
		// * 删除 被修改者的 token
		await app.redis.del(`${redisLockPrefix}#nm#refresh_token#${UserInfo.role}#${id}`);
		await app.redis.del(`${redisLockPrefix}#nm#access_token#${UserInfo.role}#${id}`);

		ctx.helper.handleSuccess();
	}

	/**
	 * @description 根据id删除用户
	 * @author bubao
	 * @date 2021-11-16 16:11:32
	 * @return {any} 空
	 * @memberof NmUserController
	 */
	async delNmUserById() {
		const { ctx, app } = this;
		// * 检验参数
		try {
			ctx.validate({
				id: { type: "string" }
			}, ctx.request.body);
		} catch (error) {
			return ctx.throw(403, { errcode: 40001, res: { field: error.errors } });
		}
		const redisLockPrefix = app.config.redisLockPrefix;
		const { id } = ctx.request.body;
		const UserInfo = await ctx.model.NmUsers.findOne({
			attributes: ["id", "username", "role", "head_portrait", "email", "created_at", "created_by", "updated_at", "updated_by", "status"],
			where: {
				id
			},
			raw: true
		});
		if (!UserInfo) {
			ctx.throw(403, { errcode: 40002 });
		}
		if (ctx.nmJwtDecodeData.role === "A" && UserInfo.role === "r") {
			// * A 不允许删除 r 帐号
			ctx.throw(403, { errcode: 40023 });
		}
		await ctx.model.NmUsers.destroy({
			where: {
				id
			}, force: true
		}).catch(() => { });
		delete UserInfo.id;
		await ctx.model.NmUsersBack.create({
			...UserInfo,
			nm_user_id: id,
			deleted_by: ctx.nmJwtDecodeData.id
		});
		// * 删除 被修改者的 token
		await app.redis.del(`${redisLockPrefix}#nm#refresh_token#${UserInfo.role}#${id}`);
		await app.redis.del(`${redisLockPrefix}#nm#access_token#${UserInfo.role}#${id}`);

		ctx.helper.handleSuccess();
	}
}

module.exports = NmUserController;
