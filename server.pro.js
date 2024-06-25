/**
 * @Description:
 * @Author: bubao
 * @Date: 2019-11-09 04:21:53
 * @LastEditors: bubao
 * @LastEditTime: 2023-11-14 16:44:55
 */
// server.js
"use strict";
const egg = require("egg");
process.env.NODE_ENV = "production";

// const workers = Number(process.argv[2] || require('os').cpus().length)
egg.startCluster({
	workers: 6,
	baseDir: __dirname,
	sticky: false,
	port: 17002,
	NODE_ENV: process.env.NODE_ENV,
	EGG_SERVER_ENV: process.env.NODE_ENV
});
// pm2 start server.pro.js --name eyu-honyaradoh-admin-service
