"use strict";

const Controller = require("egg").Controller;
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const util = require("util");
const fsMkdir = util.promisify(fs.mkdir);
const fsStat = util.promisify(fs.stat);
// const readdirPromise = util.promisify(fs.readdir);
// const fsReadFile = util.promisify(fs.readFile);
// const moment = require("moment");
// const Exec = util.promisify(require("child_process").exec);

class UploadController extends Controller {
	/**
	 * @description 创建用户时增加头像
	 * @author bubao
	 * @date 2021-11-16 11:11:54
	 * @memberof UploadController
	 */
	async uploadCreatedNmUserHeadPortrait() {
		const { ctx, app } = this;
		// 拼接本地路径

		// * 获取上传文件
		const stream = await ctx.getFileStream();
		// 只允许 jpg jpeg和png文件
		if (![".jpg", ".jpeg", ".png", ".svg"].includes(path.extname(stream.filename))) {
			stream.destroy();
			ctx.throw(400, { errcode: 40001, error: "文件类型必须是.jpg，.jpeg，.png，.svg" });
		}
		const filename = uuidv4() + path.extname(stream.filename);
		const sourcePath = path.join(app.config.private.sourceBaseDirPath, "/upload/HeadPortrait");
		// * 拼接文件路径
		const name = path.join(sourcePath, filename);
		// * 创建文件夹
		await fsMkdir(sourcePath, { recursive: true });
		// * 写文件
		await new Promise(resolve => {
			stream.pipe(fs.createWriteStream(name)).on("close", () => {
				resolve();
			}).on("error", err => {
				// console.log(err);
				resolve();
			});
		});
		ctx.helper.handleSuccess({ url: app.config.hostname + name.replace(/\\/g, "/").replace(app.config.private.sourceBaseDirPath, "") });
	}

	/**
	 * @description 上传 DailyDietary 封面文件
	 * @author bubao
	 * @date 2021-11-17 11:11:49
	 * @memberof UploadController
	 */
	async uploadDailyDietaryCover() {
		const { ctx, app } = this;
		try {
			ctx.validate({
				id: { type: "string" }
			}, ctx.request.query);
		} catch (error) {
			return ctx.throw(403, { errcode: 40001, res: { field: error.errors } });
		}
		// * 检查 id 是否存在
		const { id: daily_dietary_id } = ctx.request.query;
		const getDailyDietary = await ctx.model.DailyDietary.findOne({
			attributes: ["id"],
			where: { id: daily_dietary_id },
			raw: true
		});
		if (!getDailyDietary) {
			ctx.throw(400, { errcode: 40027 });
		}
		// 拼接本地路径
		// * 获取上传文件
		const stream = await ctx.getFileStream();
		// 只允许 jpg jpeg和png文件
		if (![".jpg", ".jpeg", ".png", ".svg"].includes(path.extname(stream.filename))) {
			stream.destroy();
			ctx.throw(400, { errcode: 40001, error: "文件类型必须是.jpg，.jpeg，.png, .svg" });
		}
		const filename = uuidv4() + path.extname(stream.filename);
		const sourcePath = path.join(app.config.private.sourceBaseDirPath, `/upload/daily_dietary/${daily_dietary_id}`);
		// * 拼接文件路径
		const name = path.join(sourcePath, filename);
		// * 创建文件夹
		await fsMkdir(sourcePath, { recursive: true });
		// * 写文件
		await new Promise(resolve => {
			stream.pipe(fs.createWriteStream(name)).on("close", () => {
				resolve();
			}).on("error", err => {
				// console.log(err);
				resolve();
			});
		});
		ctx.helper.handleSuccess({ url: app.config.hostname + name.replace(/\\/g, "/").replace(app.config.private.sourceBaseDirPath, "") });
	}

	/**
	 * @description 上传 DailyDietary 资源文件
	 * @author bubao
	 * @date 2021-11-17 11:11:49
	 * @memberof UploadController
	 */
	async uploadDailyDietary() {
		const { ctx, app } = this;
		try {
			ctx.validate({
				id: { type: "string" }
			}, ctx.request.query);
		} catch (error) {
			return ctx.throw(403, { errcode: 40001, res: { field: error.errors } });
		}
		// * 检查 id 是否存在
		const { id: daily_dietary_id } = ctx.request.query;
		const getDailyDietary = await ctx.model.DailyDietary.findOne({
			attributes: ["id"],
			where: { id: daily_dietary_id },
			raw: true
		});
		if (!getDailyDietary) {
			ctx.throw(400, { errcode: 40027 });
		}
		// 拼接本地路径
		// * 获取上传文件
		const stream = await ctx.getFileStream();
		// console.log("获取上传文件");
		const filename = uuidv4() + path.extname(stream.filename);
		const sourcePath = path.join(app.config.private.sourceBaseDirPath, `/upload/daily_dietary/${daily_dietary_id}`);
		// * 拼接文件路径
		const name = path.join(sourcePath, filename);
		// * 创建文件夹
		// console.log("创建文件夹");
		await fsMkdir(sourcePath, { recursive: true });
		// * 写文件
		// console.log("写文件");
		await new Promise(resolve => {
			stream.pipe(fs.createWriteStream(name))
				.on("close", () => {
					// console.log("close");
					resolve();
				})
				.on("error", err => {
					// console.log(err);
					resolve();
				});
		});
		ctx.helper.handleSuccess({ url: app.config.hostname + name.replace(/\\/g, "/").replace(app.config.private.sourceBaseDirPath, "") });
	}

	/**
	 * @description 上传 Health 封面文件
	 * @author bubao
	 * @date 2021-11-17 11:11:49
	 * @memberof UploadController
	 */
	async uploadHealthCover() {
		const { ctx, app } = this;
		try {
			ctx.validate({
				id: { type: "string" }
			}, ctx.request.query);
		} catch (error) {
			return ctx.throw(403, { errcode: 40001, res: { field: error.errors } });
		}
		// * 检查 id 是否存在
		const { id } = ctx.request.query;
		const getData = await ctx.model.Health.findOne({
			attributes: ["id"],
			where: { id },
			raw: true
		});
		if (!getData) {
			ctx.throw(400, { errcode: 40027 });
		}
		// 拼接本地路径
		// * 获取上传文件
		const stream = await ctx.getFileStream();
		// 只允许 jpg jpeg和png文件
		if (![".jpg", ".jpeg", ".png", ".svg"].includes(path.extname(stream.filename))) {
			stream.destroy();
			ctx.throw(400, { errcode: 40001, error: "文件类型必须是.jpg，.jpeg，.png, .svg" });
		}
		const filename = uuidv4() + path.extname(stream.filename);
		const sourcePath = path.join(app.config.private.sourceBaseDirPath, `/upload/health/${id}`);
		// * 拼接文件路径
		const name = path.join(sourcePath, filename);
		// * 创建文件夹
		await fsMkdir(sourcePath, { recursive: true });
		// * 写文件
		await new Promise(resolve => {
			stream.pipe(fs.createWriteStream(name)).on("close", () => {
				resolve();
			}).on("error", err => {
				// console.log(err);
				resolve();
			});
		});
		ctx.helper.handleSuccess({ url: app.config.hostname + name.replace(/\\/g, "/").replace(app.config.private.sourceBaseDirPath, "") });
	}

	/**
	 * @description 上传 Health 资源文件
	 * @author bubao
	 * @date 2021-11-17 11:11:49
	 * @memberof UploadController
	 */
	async uploadHealth() {
		const { ctx, app } = this;
		try {
			ctx.validate({
				id: { type: "string" }
			}, ctx.request.query);
		} catch (error) {
			return ctx.throw(403, { errcode: 40001, res: { field: error.errors } });
		}
		// * 检查 id 是否存在
		const { id } = ctx.request.query;
		const getData = await ctx.model.Health.findOne({
			attributes: ["id"],
			where: { id },
			raw: true
		});
		if (!getData) {
			ctx.throw(400, { errcode: 40027 });
		}
		// 拼接本地路径
		// * 获取上传文件
		const stream = await ctx.getFileStream();
		// console.log("获取上传文件");
		const filename = uuidv4() + path.extname(stream.filename);
		const sourcePath = path.join(app.config.private.sourceBaseDirPath, `/upload/health/${id}`);
		// * 拼接文件路径
		const name = path.join(sourcePath, filename);
		// * 创建文件夹
		// console.log("创建文件夹");
		await fsMkdir(sourcePath, { recursive: true });
		// * 写文件
		// console.log("写文件");
		await new Promise(resolve => {
			stream.pipe(fs.createWriteStream(name))
				.on("close", () => {
					// console.log("close");
					resolve();
				})
				.on("error", err => {
					// console.log(err);
					resolve();
				});
		});
		ctx.helper.handleSuccess({ url: app.config.hostname + name.replace(/\\/g, "/").replace(app.config.private.sourceBaseDirPath, "") });
	}

	/**
   * @description 判断文件夹是否存在
   * @author cw
   * @date 2021-11-04 20:11:43
   * @param {String} dirName 文件路径 app/public/upload/:id/
   * @return {Boolean} 是与否
   * @memberof NewsService
   */
	async isDirExists(dirName) {
		const fsStatus = await fsStat(dirName).catch(() => { });
		return fsStatus ? fsStatus.isDirectory() : false;
	}
}

module.exports = UploadController;
