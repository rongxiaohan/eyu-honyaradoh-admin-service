/**
 * @Description:
 * @Author: bubao
 * @Date: 2019-11-09 04:21:53
 * @LastEditors: bubao
 * @LastEditTime: 2023-11-15 10:55:58
 */
// server.js
"use strict";
const egg = require("egg");
// const posix = require("posix");

// raise maximum number of open file descriptors to 10k,
// hard limit is left unchanged
// posix.setrlimit("nofile", { soft: 10000 });
// const workers = Number(process.argv[2] || require('os').cpus().length)
// process.env.NODE_ENV = "production";

egg.startCluster({
	workers: 1,
	baseDir: __dirname,
	sticky: false,
	port: 17002,
	NODE_ENV: process.env.NODE_ENV,
	EGG_SERVER_ENV: process.env.NODE_ENV
});
// pm2 start server.js --name eyu-honyaradoh-admin-service
