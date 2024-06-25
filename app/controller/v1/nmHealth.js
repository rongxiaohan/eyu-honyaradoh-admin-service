"use strict";

const Controller = require("egg").Controller;
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const util = require("util");
// const fs = require("fs");
const moment = require("moment");
// const fsReadFile = util.promisify(fs.readFile);
const Exec = util.promisify(require("child_process").exec);
class NmHealthController extends Controller {
	/**
	 * @description 获取列表
	 * @memberof NmHealthController
	 */
	async getList() {
		const { ctx, app } = this;
		// * 检验参数
		try {
			ctx.request.query.size = ctx.request.query.size - 0 || 20;
			ctx.request.query.page = ctx.request.query.page - 0 || 1;
			ctx.validate({
				size: { type: "number", required: false, min: 1, max: 20 },
				page: { type: "number", required: false, min: 1 },
				status: { type: "enum", required: false, values: ["0", "1", "2", "3", "4", ""] },
				title: { type: "string", required: false },
				health_classification_id: { type: "string", required: false }
			}, ctx.request.query);
		} catch (error) {
			return ctx.throw(403, { errcode: 40001, res: { field: error.errors } });
		}

		const { page = 1, size: limit, status, title, health_classification_id } = ctx.request.query;
		const offset = (page - 1) * (limit);
		const query = {
			attributes: [
				"id",
				"title",
				"summary",
				"has_video",
				"cover",
				"health_classification_id",
				"published_at",
				"published_by",
				"created_by",
				"created_at",
				"status",
				"views",
				"updated_at",
				"updated_by"
			],
			order: [["updated_at", "DESC"], ["id", "DESC"]],
			include: [{ attributes: ["id", "name"], model: ctx.model.HealthClassification, as: "healthClassification" }, { attributes: ["username"], model: ctx.model.NmUsers, as: "createdBy" }, { attributes: ["username"], model: ctx.model.NmUsers, as: "updatedBy" }],
			// raw: true,
			limit,
			offset
		};
		const Op = app.Sequelize.Op;
		query.where = {};

		if (status !== "" && status !== undefined) {
			query.where.status = status - 0;
		} else {
			// * 默认不返回初始化中的文章
			query.where.status = { [Op.ne]: 0 };
		}

		if (health_classification_id) {
			query.where.health_classification_id = health_classification_id;
		}

		if (title) query.where.title = { [Op.like]: `%${title}%` };
		const List = await ctx.model.Health.findAndCountAll(query);

		ctx.helper.handleSuccess(List);
	}

	/**
	 * @description 初始化一条并返回id
	 * @author bubao
	 * @date 2021-11-17 11:11:20
	 * @memberof NmHealthController
	 */
	async createOne() {
		const { ctx, app } = this;
		const { id: user_id } = ctx.nmJwtDecodeData;
		const daily_dietary_id = uuidv4();

		const edite_id = daily_dietary_id;
		const edite_by_id = user_id + "";
		const Minutes = 60;
		const redisLockPrefix = app.config.redisLockPrefix;
		await app.redis.set(`${redisLockPrefix}#lock#editeHealth#${edite_id}`, edite_by_id, "EX", 60 * Minutes);
		const result = await ctx.model.Health.create({
			id: daily_dietary_id,
			created_by: user_id,
			updated_by: user_id
		});

		ctx.helper.handleSuccess(result.dataValues);
	}

	/**
	 * @description 保存为草稿
	 * @author bubao
	 * @date 2021-11-17 12:11:55
	 * @memberof NmHealthController
	 */
	async saveAsDraft() {
		const { ctx, app } = this;
		// * 检验参数
		try {
			ctx.validate({
				id: { type: "string" },
				title: { type: "string" },
				summary: { type: "string" },
				content: { type: "string" },
				cover: { type: "string" },
				health_classification_id: { type: "string" }
			}, ctx.request.body);
		} catch (error) {
			return ctx.throw(403, { errcode: 40001, res: { field: error.errors } });
		}
		// * 查锁
		const edite_id = ctx.request.body.id;
		const edite_by_id = ctx.nmJwtDecodeData.id;
		const redisLockPrefix = app.config.redisLockPrefix;
		const editorLockKey = `${redisLockPrefix}#lock#editeHealth#${edite_id}`;
		const lockKey = `${redisLockPrefix}#lock#saveHealth#${edite_id}`;
		const editeBy = ((await app.redis.get(editorLockKey)) || "") + "";

		if (editeBy && edite_by_id !== editeBy) {
			// 被编辑
			ctx.throw(400, { errcode: 40040 });
		}
		const { title, content, cover, id, summary, health_classification_id } = ctx.request.body;

		const has_classification = await ctx.model.HealthClassification.findOne({
			attributes: ["id"],
			where: {
				id: health_classification_id
			} });
		if (!has_classification) {
			ctx.throw(400, { errcode: 40028 });
		}
		// * 加锁
		const tagsLocked = await app.redis.set(lockKey, true, "EX", 5, "NX"); // info 连点拦截器
		if (tagsLocked !== "OK") {
			// info 操作太快
			ctx.throw(400, { errcode: 40044 });
		}


		await ctx.service.health.updatedInfo({ title, content, cover, id, summary, status: 1, health_classification_id });
		// * 删锁
		await app.redis.del(lockKey); // 先解锁连点拦截器
		await app.redis.del(editorLockKey); // 再解锁编辑拦截器
		ctx.helper.handleSuccess();
	}

	/**
	 * @description 保存为发布文章
	 * @author bubao
	 * @date 2021-11-17 12:11:55
	 * @memberof NmHealthController
	 */
	async saveAsArticle() {
		const { ctx, app } = this;
		// * 检验参数
		try {
			ctx.validate({
				id: { type: "string" },
				title: { type: "string" },
				summary: { type: "string" },
				content: { type: "string" },
				cover: { type: "string" },
				health_classification_id: { type: "string" }
			}, ctx.request.body);
		} catch (error) {
			return ctx.throw(403, { errcode: 40001, res: { field: error.errors } });
		}

		// * 查锁
		const edite_id = ctx.request.body.id;
		const edite_by_id = ctx.nmJwtDecodeData.id;
		const redisLockPrefix = app.config.redisLockPrefix;
		const editorLockKey = `${redisLockPrefix}#lock#editeHealth#${edite_id}`;
		const lockKey = `${redisLockPrefix}#lock#saveHealth#${edite_id}`;
		const editeBy = ((await app.redis.get(editorLockKey)) || "") + "";

		if (editeBy && edite_by_id !== editeBy) {
			// 被编辑
			ctx.throw(400, { errcode: 40040 });
		}
		const { title, content, cover, id, summary, health_classification_id } = ctx.request.body;

		const has_classification = await ctx.model.HealthClassification.findOne({
			attributes: ["id"],
			where: {
				id: health_classification_id
			} });
		if (!has_classification) {
			ctx.throw(400, { errcode: 40028 });
		}
		// * 加锁
		const tagsLocked = await app.redis.set(lockKey, true, "EX", 5, "NX"); // info 连点拦截器
		if (tagsLocked !== "OK") {
			// info 操作太快
			ctx.throw(400, { errcode: 40044 });
		}


		await ctx.service.health.updatedInfo({ title, content, cover, id, summary, status: 2, health_classification_id });
		// * 删锁
		await app.redis.del(lockKey); // 先解锁连点拦截器
		await app.redis.del(editorLockKey); // 再解锁编辑拦截器
		ctx.helper.handleSuccess();
	}

	/**
	 * @description 获取一条的详细信息用于编辑
	 */
	async getInfoToEdite() {
		const { ctx, app } = this;
		// * 检验参数
		try {
			ctx.validate({
				id: { type: "string" }
			}, ctx.request.query);
		} catch (error) {
			return ctx.throw(403, { errcode: 40001, res: { field: error.errors } });
		}
		// * 检查是否存在，检查是否为上架状态
		await ctx.service.health.checkStatus(ctx.request.query.id);
		// * 查锁
		const edite_id = ctx.request.query.id;
		const edite_by_id = ctx.nmJwtDecodeData.id + "";
		const redisLockPrefix = app.config.redisLockPrefix;
		const lockKey = `${redisLockPrefix}#lock#saveHealth#${edite_id}`;
		const editorLockKey = `${redisLockPrefix}#lock#editeHealth#${edite_id}`;
		const editeBy = ((await app.redis.get(editorLockKey)) || "") + "";

		// console.log("edite_by_id,editeBy", edite_by_id, editeBy);
		if (editeBy && edite_by_id !== editeBy) {
			// 被编辑
			ctx.throw(400, { errcode: 40040 });
		}
		// * 加锁
		const tagsLocked = await app.redis.set(lockKey, true, "EX", 5, "NX");
		if (tagsLocked !== "OK") {
			// 操作太快
			ctx.throw(400, { errcode: 40044 });
		}
		const DataInfo = await ctx.model.Health.findOne({
			attributes: [
				"id",
				"title", // / 文章名称
				"cover", // / 封面图
				"summary", // / 摘要
				"content", // / 文章内容
				"has_video", // / 用无视频通过检查符文本获取
				"views", // / 阅读量
				"health_classification_id",
				"created_at",
				"updated_at",
				"created_by", // / 由谁创建
				"status", // / 0新建 1草稿 2发布 3下架 4编辑中
				"updated_by", // / 由谁更新
				"published_at", // / 发布时间
				"published_by"// / 发布人
			],
			where: {
				id: ctx.request.query.id
			},
			include: [
				{ attributes: ["username"], model: ctx.model.NmUsers, as: "createdBy" },
				{ attributes: ["username"], model: ctx.model.NmUsers, as: "updatedBy" },
				{ attributes: ["username"], model: ctx.model.NmUsers, as: "publishedBy" },
				{ attributes: ["name"], model: ctx.model.HealthClassification, as: "healthClassification" }
			]
		});

		if (!DataInfo) {
			await app.redis.del(lockKey);
			ctx.throw(400, { errcode: 40027 });
		}
		// DataInfo = DataInfo.dataValues;

		// * 是发布状态，不可被编辑
		if (DataInfo.status === 2) {
			await app.redis.del(lockKey);
			ctx.throw(400, { errcode: 40026 });
		}
		const status = DataInfo.status === 0 ? 0 : 4;
		await ctx.model.Health.update({
			status,
			updated_by: ctx.nmJwtDecodeData.id
		}, {
			where: {
				id: ctx.request.query.id
			}
		});
		// * 返回数据
		const Minutes = 60;
		await app.redis.set(editorLockKey, edite_by_id, "EX", 60 * Minutes);
		await app.redis.del(lockKey);

		ctx.helper.handleSuccess(DataInfo.dataValues);
	}

	/**
	 * @description 修改状态
	 */
	async changeStatus() {
		const { ctx, app } = this;
		// * 检验参数
		try {
			ctx.validate({
				id: { type: "string" },
				status: { type: "number" }
			}, ctx.request.body);
		} catch (error) {
			return ctx.throw(403, { errcode: 40001, res: { field: error.errors } });
		}
		const { id, status } = ctx.request.body;
		if (!(status === 1 || status === 2 || status === 3)) {
			ctx.throw(400, { errcode: 40001 });
		}
		const DataInfo = await ctx.model.Health.findOne({
			where: {
				id
			}
		});

		if (!DataInfo) {
			ctx.throw(400, { errcode: 40027 });
		}
		if (DataInfo.status === 0 || DataInfo.status === 4) {
			// 文章处于编辑状态，不可保存
			ctx.throw(400, { errcode: 40040 });
		}
		// * 查锁
		const edite_id = ctx.request.query.id;
		const edite_by_id = ctx.nmJwtDecodeData.id + "";
		const redisLockPrefix = app.config.redisLockPrefix;
		const lockKey = `${redisLockPrefix}#lock#saveHealth#${edite_id}`;
		const editeLockKey = `${redisLockPrefix}#lock#editeHealth#${edite_id}`;

		const editeBy = ((await app.redis.get(editeLockKey)) || "") + "";

		// console.log("edite_by_id,editeBy", edite_by_id, editeBy);
		if (editeBy && edite_by_id !== editeBy) {
			// 被编辑
			ctx.throw(400, { errcode: 40040 });
		}
		const locked = await app.redis.set(lockKey, true, "EX", 5, "NX");

		if (locked !== "OK") {
			ctx.throw(400, { errcode: 40044 });
		}
		let updateQuery = {
			status,
			updated_by: ctx.nmJwtDecodeData.id
		};
		// updateQuery.updated_by = ctx.nmJwtDecodeData.id;
		if (status === 2) {
			// updateQuery.published_by = ctx.nmJwtDecodeData.id;
			// updateQuery.published_at = moment().valueOf();
			updateQuery = {
				...updateQuery,
				published_by: ctx.nmJwtDecodeData.id,
				published_at: moment().valueOf()
			};
		}
		await DataInfo.update(updateQuery);
		// 解锁
		await app.redis.del(lockKey);
		await app.redis.del(editeLockKey);
		ctx.helper.handleSuccess();
	}

	/**
	 * @description 根据id删除一篇文章
	 */
	async deleteOne() {
		const { ctx, app } = this;
		// * 检验参数
		try {
			ctx.validate({
				id: { type: "string" }
			}, ctx.request.body);
		} catch (error) {
			return ctx.throw(403, { errcode: 40001, res: { field: error.errors } });
		}
		const { id } = ctx.request.body;
		const redisLockPrefix = app.config.redisLockPrefix;
		const edite_id = id;
		const editeLockKey = `${redisLockPrefix}#lock#editeHealth#${edite_id}`;
		// 检查轮播图id是否存在
		const DataInfo = await ctx.model.Health.findOne({
			where: {
				id
			}
		});

		if (!DataInfo) {
			ctx.throw(400, { errcode: 40027 });
		}
		await DataInfo.destroy({
			force: true
		});
		const sourcePath = path.join(app.config.private.sourceBaseDirPath, `/upload/health/${id}`);
		// * 删除本地资源
		await Exec("rm -rf " + sourcePath).catch(err => {
			console.error("删除失败" + err);
		});
		await app.redis.del(editeLockKey);

		// 返回ok
		ctx.helper.handleSuccess();
	}
}

module.exports = NmHealthController;
