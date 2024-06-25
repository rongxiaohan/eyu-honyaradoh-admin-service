/**
 * @Description: 
 * @author: bubao
 * @Date: 2021-11-10 16:01:57
 * @LastEditors: bubao
 * @LastEditTime: 2021-11-11 14:01:13
 */
module.exports = {
	datasources: [
		{
			dialect: 'mysql', // 表示使用mysql
			host: '192.168.1.12', // 连接的数据库主机地址
			port: 3306, // mysql服务端口
			database: 'eyu-lx100box', // 数据库名
			username: 'root', // 数据库用户名
			password: 'dev01.eyuai.MYSQL',
			timezone: '+8:00',
			dialectOptions: { // 让读取date类型数据时返回字符串而不是UTC时间
				dateStrings: true,
				typeCast(field, next) {
					if (field.type === 'DATETIME') {
						return field.string();
					}
					return next();
				},
			},
		}
	],
	userConfig: {
		// myAppName: 'egg',
		hostname: 'http://eyuai.tpddns.cn:8090',
	},
	redisProdConfig: {
		// Redis: require('ioredis'),
		client: {
			sentinels: null,
			port: 6379,          // Redis port
			host: '192.168.1.12',   // Redis host
			password: '',
			db: 3,
		}
	},
	private: {
		sourceBaseDirPath: "/var/17002", // 不能以`/`结尾
		// 小程序相关配置
		mini_program: {
			appID: "wxdef8d237e08d152c",
			appSecret: "a17ad1d358aa9939ffbd530956cec130"
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
	},
	jaeger: {
		config: {
			serviceName: 'eyu-lx100boxsvr',
			sampler: {
				type: 'const',
				param: 1,
			},
			reporter: {
				logSpans: true,
				collectorEndpoint: 'http://192.168.1.11:14268/api/traces'
				// collectorEndpoint: 'http://ap-guangzhou.apm.tencentcs.com:14268/api/traces',
			},
		},
		options: {
			tags: {
				token: 'xxx' // 业务申请的 token
			}
		},
		hooks: {
			redis: true,
			mongoose: true,
			http: true,
			sequelize: true,
		},
		middlewareIndex: 1,

	},
}