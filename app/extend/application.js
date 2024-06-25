/**
 * @Description: 应用对象扩展
 * @Author: chenchen
 * @Date: 2021-02-20 17:33:40
 * @LastEditors: bubao
 * @LastEditTime: 2021-07-19 10:21:25
 */
"use strict";
// eslint-disable-next-line no-unused-vars
const Axios = require("axios").default;
/** @type {Axios} */
const axios = require("axios");

module.exports = {
	/**
	 * 更新应用对象属性值
	 * @param {String} key 属性名或访问链，如user.id
	 * @param {*} val 值
	 */
	async setStorage(key, val) {
		this.messenger.sendToApp("updApplicationStorage", { key, val });
		await new Promise(resolve => {
			this.messenger.on("updApplicationStorageFinish", resolve);
		});
	},
	axios,
	_DYNAMIC_CONF: {}
};
