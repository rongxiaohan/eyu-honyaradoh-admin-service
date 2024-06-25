/**
 * @Description: 工具方法
 * @Author: chenchen
 * @Date: 2021-02-20 17:33:40
 * @LastEditors: bubao
 * @LastEditTime: 2023-11-15 17:29:19
 */
"use strict";
const moment = require("moment");
const crypto = require("crypto");
const path = require("path");
const mkdirp = require("mkdirp2");
const logToRemote = require("../../logToRemote");
const iv = "6bbc47a2756d6d6bf315cfd3cc0b711a"; // 向量，token二次加密用
const key = "QSVP5loZmF3eoFeb"; // 密钥串，token二次加密用

const CryptoJS = require("crypto-js");

module.exports = {
	/**
	 * 验证号码是否符合要求
	 * @param {string} phoneNumber 手机号码
	 * @return {boolean} boolean
	 */
	isPhoneNumber(phoneNumber) {
		return (
			!!phoneNumber &&
			/^1([38][0-9]|4[0-9]|5[0-3,5-9]|6\d|7[0135678]|9\d)\d{8}$/.test(
				phoneNumber
			)
		);
	},

	/**
	 * 是否缺失
	 * @param {Object} props 参数对象
	 * @param {Array} requireKeys 必须有的参数键值
	 */
	isLost(props, requireKeys) {
		const losts = [];
		for (const key of requireKeys) {
			if (props[key] === undefined) {
				losts.push(key);
			}
		}
		return {
			isLost: !!losts.length,
			lostKeys: losts
		};
	},
	/**
	 * 是否为空值（此处的空不仅仅指null，还指空字符串、空对象、空数组）
	 * @param {Object} props 参数对象
	 * @param {Array} requireKeys 必须有的参数键值
	 */
	isValueNull(props, requireKeys) {
		const invalidKeys = [];
		for (const key of requireKeys) {
			if (
				props[key] === null ||
				props[key] === "" ||
				JSON.stringify(props[key]) === "{}" ||
				JSON.stringify(props[key]) === "[]"
			) {
				invalidKeys.push(key);
			}
		}
		return {
			hasValueNull: !!invalidKeys.length,
			invalidKeys
		};
	},
	/**
	 * 验证参数是否正确
	 * @param {Object} props 参数对象
	 * @param {Array} requireKeys 必须有的参数键值
	 */
	isValid(props, requireKeys) {
		const { isLost, lostKeys } = this.isLost(props, requireKeys);
		const { hasValueNull, invalidKeys } = this.isValueNull(
			props,
			requireKeys
		);
		const result = {};
		if (isLost) {
			result.lost = lostKeys;
		}
		if (hasValueNull) {
			result.invalid = invalidKeys;
		}
		const status = !(isLost || hasValueNull);
		return {
			status,
			result: status ? undefined : result
		};
	},

	/**
	 * 生成指定长度数字
	 * @param {number} len 长度
	 * @return {string} '6'
	 */
	randomCnt(len) {
		const arr = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
		let code = "";
		for (let i = 0; i < len; i++) {
			code += arr[Math.floor(Math.random() * 10)];
		}
		return code;
	},

	/**
	 * 成功响应
	 * @param {Object} res 响应数据
	 */
	handleSuccess(res = {}) {
		const { ctx } = this;
		ctx.status = 200;
		ctx.body = {
			errcode: "0",
			errmsg: "ok",
			...res
		};
	},
	/**
	 * 失败响应
	 * @param {Integer} statusCode 错误码
	 * @param {Object} res 响应数据
	 */
	handleFail(statusCode = 40000, res = {}) {
		const { ctx } = this;
		try {
			const { errcode, errmsg, errorCode } = ctx.helper.errcode[
				statusCode
			];
			ctx.status = errorCode;
			ctx.body = {
				errcode,
				errmsg,
				...res
			};
		} catch (error) {
			const { errcode, errmsg, errorCode } = ctx.helper.errcode[40000];
			ctx.status = errorCode;
			ctx.body = {
				errcode,
				errmsg
			};
		}
	},

	errorCode: {
		200: "请求成功。客户端向服务器请求数据，服务器返回相关数据",
		201: "资源创建成功。客户端向服务器提供数据，服务器创建资源",
		202: "请求被接收。但处理尚未完成",
		204: "客户端告知服务器删除一个资源，服务器移除它",
		206: "请求成功。但是只有部分回应",
		400: "请求无效。数据不正确，请重试",
		401: "请求没有权限。缺少API token，无效或者超时",
		403: "用户得到授权，但是访问是被禁止的。",
		404: "发出的请求针对的是不存在的记录，服务器没有进行操作。",
		406: "请求失败。请求头部不一致，请重试",
		410: "请求的资源被永久删除，且不会再得到的。",
		422: "请求失败。请验证参数",
		500: "服务器发生错误，请检查服务器。",
		502: "网关错误。",
		503: "服务不可用，服务器暂时过载或维护。",
		504: "网关超时。"
	},
	errcode: {
		0: { errcode: "0", errmsg: "成功", errorCode: 200 },
		40000: { errcode: "40000", errmsg: "操作失败", errorCode: 400 },
		40001: { errcode: "40001", errmsg: "请求参数错误", errorCode: 400 },
		40002: { errcode: "40002", errmsg: "用户不存在", errorCode: 400 },
		40016: {
			errcode: "40016",
			errmsg: "验证码错误",
			errorCode: 400
		},
		40017: {
			errcode: "40017",
			errmsg: "验证码无效",
			errorCode: 400
		},
		40018: {
			errcode: "40018",
			errmsg: "邮箱无效",
			errorCode: 400
		},
		40019: {
			errcode: "40019",
			errmsg: "账号或邮箱已存在",
			errorCode: 400
		},
		40020: {
			errcode: "40020",
			errmsg: "请勿连续获取验证码",
			errorCode: 400
		},
		40021: {
			errcode: "40021",
			errmsg: "邮箱发送失败，请重试",
			errorCode: 400
		},
		40022: {
			errcode: "40022",
			errmsg: "该邮箱已注册",
			errorCode: 400
		},
		40023: {
			errcode: "40023",
			errmsg: "无数据访问权限",
			errorCode: 401
		},
		40024: { errcode: "40024", errmsg: "用户状态不可用", errorCode: 400 },
		40025: { errcode: "40025", errmsg: "资源有其他绑定数据，不可删除", errorCode: 400 },
		40026: { errcode: "40026", errmsg: "需要先下架", errorCode: 400 },
		40027: { errcode: "40027", errmsg: "资源不存在", errorCode: 400 },
		40028: { errcode: "40028", errmsg: "前置资源不存在", errorCode: 400 },
		// 40029: { errcode: "40029", errmsg: "comany 不存在", errorCode: 400 },
		// 40030: { errcode: "40030", errmsg: "comany 状态不可用", errorCode: 400 },
		// 40031: { errcode: "40031", errmsg: "employment 不存在", errorCode: 400 },
		// 40032: { errcode: "40032", errmsg: "code 无效", errorCode: 400 },
		// 40033: { errcode: "40033", errmsg: "微信后台token错误，前端自动重试", errorCode: 400 },
		// 40034: { errcode: "40034", errmsg: "获取微信用户信息失败，前端自动重试", errorCode: 400 },
		// 40035: { errcode: "40035", errmsg: "号码解析错误", errorCode: 400 },
		// 40036: { errcode: "40036", errmsg: "号码不属于该小程序", errorCode: 400 },
		40037: {
			errcode: "40037",
			errmsg: "短信验证码发送失败，请重试",
			errorCode: 400
		},
		40038: { errcode: "40038", errmsg: "验证码错误", errorCode: 400 },
		40039: { errcode: "40039", errmsg: "解析号码失败", errorCode: 400 },
		40040: { errcode: "40040", errmsg: "正在被编辑", errorCode: 400 },
		40041: { errcode: "40041", errmsg: "收藏列表相同，不更新", errorCode: 400 },
		40042: { errcode: "40042", errmsg: "已置顶三个，不可再添加", errorCode: 400 },
		// 40043: { errcode: "40043", errmsg: "activity 不存在", errorCode: 400 },
		40044: { errcode: "40044", errmsg: "操作太快，请稍后重试", errorCode: 400 },
		40045: { errcode: "40045", errmsg: "不可修改", errorCode: 400 },
		40046: {
			errcode: "40046",
			errmsg: "图形验证码错误",
			errorCode: 400
		},
		50000: {
			errcode: "50000",
			errmsg: "服务器发生错误",
			errorCode: 500
		},
		50001: {
			errcode: "50001",
			errmsg: "令牌验证失败",
			errorCode: 401
		},
		50002: {
			errcode: "50002",
			errmsg: "令牌解析失败",
			errorCode: 401
		},
		50003: {
			errcode: "50003",
			errmsg: "令牌已失效",
			errorCode: 401
		},
		50004: {
			errcode: "50004",
			errmsg: "无数据访问权限",
			errorCode: 401
		},
		50005: {
			errcode: "50005",
			errmsg: "signatureNonce 在短时间内重复",
			errorCode: 401
		},
		50006: {
			errcode: "50006",
			errmsg: "signature 错误",
			errorCode: 401
		},
		50007: {
			errcode: "50007",
			errmsg: "号码绑定关系解除", // 号码绑定关系解除
			errorCode: 401
		},
		50008: {
			errcode: "50008",
			errmsg: "refresh token令牌解析失败",
			errorCode: 401
		}
	},

	/**
	 * 整数前自动补0
	 * @param {Integer} num 数值
	 * @param {Integer} len 需要的长度
	 */
	prefixInteger: (num, len) => {
		if (!len) return num;
		if (num.toString().length >= len) return num;
		return (Array(len).join("0") + num).slice(-len);
	},

	/**
	 * 将日志在打印到控制台的同时输出到日志服务
	 *
	 * @param {String} type 日志类型 request\response\normal\error\sequelize
	 * @param {String} content 日志内容
	 * @param {Object} Info 日志信息 lq_id, call_id, description
	 */
	logToRemote,

	/**
	 * 生成令牌
	 * @param {Object} data 欲加密数据
	 * @param {Integer} expiresIn 过期时间，默认2小时
	 */
	async generateToken(data, expiresIn = 7200) {
		const { app, ctx } = this;
		const token = await ctx.jwt.sign(data, app.config.keys, {
			expiresIn
		});
		// 将token二次加密
		// const encrytedToken = this.encrypteToken(token);
		return {
			// access_token: encrytedToken,
			access_token: token,
			expires_in: expiresIn,
			expires_timestamp: moment().add(expiresIn, "s").valueOf()
		};
	},

	/**
	 * @description 生成签名
	 * @author bubao
	 * @date 2021-07-19 10:07:26
	 * @param {any} params 参数
	 * @return {string} 签名
	 */
	generateSign(params) {
		// 按参数名首字母排序参数
		const keys = Object.keys(params).sort();
		let paramsStr = "";
		// 拼接参数
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			// 参数值URIencode
			paramsStr += `${key}=${encodeURIComponent(params[key])}`;
			if (i < keys.length - 1) {
				paramsStr += "&";
			}
		}
		// const result = crypto
		// 	.createHash("sha256")
		// 	.update(paramsStr)
		// 	.digest("hex")
		// 	.toUpperCase();
		return paramsStr;
	},

	HmacSHA1(params, key) {
		params = JSON.parse(JSON.stringify(params));
		const keys = Object.keys(params).sort();
		let paramsStr = "";
		// 拼接参数
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			// 参数值URIencode
			paramsStr += `${key}=${encodeURIComponent(params[key])}`;
			if (i < keys.length - 1) {
				paramsStr += "&";
			}
		}
		return CryptoJS.HmacSHA1(paramsStr, key).toString();
	},

	/**
	 * 校验令牌
	 * @param {String} token 令牌
	 */
	async verifyToken(token) {
		const { app, ctx } = this;
		try {
			await ctx.jwt.verify(token, app.config.keys);
		} catch (err) {
			// console.log("err", err);
			ctx.throw(401, {
				errcode: 50001
			});
		}
	},

	/**
	 * 解析令牌
	 * @param {String} token 令牌
	 */
	decodeToken(token) {
		const { ctx } = this;
		let result = null;
		try {
			result = ctx.jwt.decode(token);
		} catch (err) {
			ctx.throw(401, {
				errcode: 50002
			});
		}
		return result;
	},

	/**
	 * 加密令牌
	 * @param {String} token 令牌
	 */
	encrypteToken(token) {
		const startIndex = token.indexOf(".") + 1;
		const endIndex = startIndex + 16;
		const encryptedTokenPart =
			this.doEncrypte(token.slice(startIndex, endIndex)) + ".";
		return (
			token.slice(0, startIndex) +
			encryptedTokenPart +
			token.slice(endIndex)
		);
	},

	/**
	 * 解密令牌
	 * @param {String} encrytedToken 二次加密后的令牌
	 */
	decrypteToken(encrytedToken) {
		let originToken = "";
		const encryptedTokenChunks = encrytedToken.split(".");
		const encryptedOpts = encryptedTokenChunks.splice(1, 2);
		const originTokenPart = this.doDecrypte(
			encryptedOpts[0],
			encryptedOpts[1]
		);
		originToken =
			encryptedTokenChunks[0] +
			"." +
			originTokenPart +
			encryptedTokenChunks.slice(1).join(".");
		return originToken;
	},

	/**
	 * aes-128-gcm加密
	 * @param {String} str 欲加密串
	 */
	doEncrypte(str) {
		const inputEncoding = "utf8";
		const outputEncoding = "base64";
		const cipherChunks = [];
		let authTag = "";
		try {
			const cipher = crypto.createCipheriv("aes-128-gcm", key, iv);
			cipher.setAutoPadding(true);
			cipherChunks.push(cipher.update(str, inputEncoding, outputEncoding));
			cipherChunks.push(cipher.final(outputEncoding));
			authTag = cipher.getAuthTag().toString("base64");
		} catch (err) {
			this.ctx.helper.logToRemote(
				"error",
				"encrypte token fail: " + err.message
			);
			return "";
		}
		return (cipherChunks.join("") + "." + authTag).replace(/=/g, "");
	},

	/**
	 * aes-128-gcm解密
	 * @param {String} encrypted_str 加密串
	 * @param {String} authTag 解密用标签
	 */
	doDecrypte(encrypted_str, authTag) {
		const inputEncoding = "base64";
		const outputEncoding = "utf8";
		const decipherChunks = [];
		try {
			const decipher = crypto.createDecipheriv("aes-128-gcm", key, iv);
			decipher.setAuthTag(Buffer.from(authTag, "base64"));
			decipher.setAutoPadding(true);
			decipherChunks.push(
				decipher.update(encrypted_str, inputEncoding, outputEncoding)
			);
			decipherChunks.push(decipher.final(outputEncoding));
		} catch (err) {
			this.ctx.helper.logToRemote(
				"error",
				"decrypte token fail: " + err.message
			);
			return "";
		}
		return decipherChunks.join("");
	},

	/**
	 * 微信小程序插件tts
	 * @param {Object} options {}
	 */
	async tempDialogPath(options) {
		// 建立路径
		const { lq_id, fileName = "temp.wav" } = options;
		// 建立路径  /public/temp/${lq_id}/${temp}.wav
		const basedir = path.join("/data/xwyx", lq_id);
		await mkdirp.promise(basedir);
		const targetPath = path.join(basedir, fileName);
		return targetPath;
	},
	guid() {
		return (() => {
			let id = new Date().getTime().toString(32);
			for (let i = 0; i < 5; i++) {
				id += Math.floor(Math.random() * 65535).toString(32);
			}
			return "eyu_plugin_" + id;
		})();
	}
};
