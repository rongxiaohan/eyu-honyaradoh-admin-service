/**
 * @Description:
 * @author: bubao
 * @Date: 2021-11-10 15:45:34
 * @LastEditors: bubao
 * @LastEditTime: 2023-11-15 09:11:10
 */
"use strict";

/** @type Egg.EggPlugin */
exports.sequelize = {
	enable: true,
	package: "egg-sequelize"
};
exports.cors = {
	enable: true,
	package: "egg-cors"
};
exports.jwt = {
	enable: true,
	package: "egg-easy-jwt"
};

exports.redis = {
	enable: true,
	package: "egg-redis"
};
exports.validate2 = {
	enable: true,
	package: "egg-validate2"
};
exports.validate = {
	enable: true,
	package: "egg-validate"
};

