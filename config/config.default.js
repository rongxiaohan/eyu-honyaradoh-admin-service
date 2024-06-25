/**
 * @Description:
 * @author: bubao
 * @Date: 2021-11-10 15:45:34
 * @LastEditors: bubao
 * @LastEditTime: 2023-11-17 19:27:57
 */
/* eslint valid-jsdoc: "off" */

"use strict";
const path = require("path");
let env;
try {
	// eslint-disable-next-line node/no-unpublished-require
	env = require("../.env.js");
} catch (error) {
	env = {};
}
// 引入访问白名单配置
const domainWhiteList = require("./domainWhiteList.json");
/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = appInfo => {
	/**
   * built-in config
   * @type {Egg.EggAppConfig}
   **/
	const config = {};

	// use for cookie sign key, should change to your own and keep security
	config.keys = "eyu_honyaradoh_1636530327011_3862";

	// add your middleware config here
	// 中间件配置
	config.middleware = ["contextHandler", "cErrorHandler"];
	config.onerror = {
		html(ctx, err) {
			ctx.body = "<h3>error</h3>";
			ctx.status = 500;
		}
	};
	// config.errorHandler = {
	// 	match: "/"
	// };
	config.security = {
		csrf: {
			useSession: true,
			enable: false,
			cookieName: "csrfToken",
			sessionName: "csrfToken"
		},
		// 访问白名单配置
		domainWhiteList
	};
	config.validate2 = {
	};
	config.cors = {
		origin: "*",
		exposeHeaders: "WWW-Authenticate,Server-Authorization,Date",
		maxAge: 100,
		credentials: true,
		allowMethods: "GET,HEAD,PUT,POST,DELETE,PATCH,OPTIONS",
		allowHeaders: "Content-Type,Authorization,Accept,X-Custom-Header,anonymous"
	};

	config.sequelize = {
		dialect: "mysql", // 表示使用mysql
		host: "172.16.8.52", // 连接的数据库主机地址
		port: 3306, // mysql服务端口
		database: "eyu_honyaradoh", // 数据库名
		username: "root", // 数据库用户名
		password: "3W.eyuai.org",
		timezone: "+08:00",
		define: {
			underscored: false
		},
		dialectOptions: { // 让读取date类型数据时返回字符串而不是UTC时间
			dateStrings: true,
			typeCast(field, next) {
				if (field.type === "DATETIME") {
					return field.string();
				}
				return next();
			}
		}
	};
	if (env.datasources) {
		config.sequelize = {
			datasources: env.datasources
		};
	}

	config.redis = {
		client: {
			port: 6379,
			host: "localhost",
			password: "",
			db: 3 // 单机模式的默认库
		}
	};
	if (env.redisProdConfig) {
		config.redis = env.redisProdConfig;
	}

	config.redisLockPrefix = "eyu_honyaradoh";

	if (env.redisLockPrefix) {
		config.redisLockPrefix = env.redisLockPrefix;
	}

	// add your user config here
	config.multipart = {
		// mode: 'file',
		fileSize: "512mb"
	};
	let userConfig = {
		// myAppName: 'egg',
		hostname: "https://cmp.eyuai.com"
	};
	if (env.userConfig) {
		userConfig = env.userConfig;
	}
	// add your user config here
	config.notify_email = {
		smtp: "smtp.exmail.qq.com",
		from: "report@eyuai.com",
		password: "6Ane8RNWfiaFetNn"
	};
	// eslint-disable-next-line multiline-ternary
	config.private = {
		sourceBaseDirPath: "/data/eyu_honyaradoh",
		// 小程序相关配置
		mini_program: {
			// appID: "wxdef8d237e08d152c",
			appID: "wxa0134d4fb2eed07b",
			// appSecret: "a17ad1d358aa9939ffbd530956cec130"
			appSecret: "65db7e82e34fdacf86551f9fc73c3ccf"
		},
		SMS: {
			Tencent: {
				options: {
					appid: 1400245830, // 应用id
					appkey: "f0baf32d26df5f97b8a4cc8a1bc68797" // 短信应用 SDK AppKey
				},
				template: [
					401173 // 注册验证码
					// 871979, // 自分裂服务被发展人奖励提醒
					// 871977 // 自分裂服务发展人奖励提醒
				]
			}
		}
	};
	if (env.private) {
		config.private = env.private;
	}
	config.static = {
		prefix: "/",
		dir: [path.join(appInfo.baseDir, "app/public")]
	};

	return {
		...config,
		...userConfig
	};
};
