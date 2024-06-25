"use strict";

const Controller = require("egg").Controller;
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const util = require("util");
// const fs = require("fs");
const moment = require("moment");
// const fsReadFile = util.promisify(fs.readFile);
const Exec = util.promisify(require("child_process").exec);
class NmDailyDietaryController extends Controller {
	/**
	 * @description 获取列表
	 * @author bubao
	 * @date 2021-11-17 09:11:46
	 * @memberof NmDailyDietaryController
	 */
	async getDailyDietaryList() {
		const { ctx, app } = this;
		// * 检验参数
		try {
			ctx.request.query.size = ctx.request.query.size - 0 || 20;
			ctx.request.query.page = ctx.request.query.page - 0 || 1;
			ctx.validate({
				size: { type: "number", required: false, min: 1, max: 20 },
				page: { type: "number", required: false, min: 1 },
				status: { type: "enum", required: false, values: ["0", "1", "2", "3", "4", ""] },
				title: { type: "string", required: false }
			}, ctx.request.query);
		} catch (error) {
			return ctx.throw(403, { errcode: 40001, res: { field: error.errors } });
		}

		const { page = 1, size: limit, status, title } = ctx.request.query;
		const offset = (page - 1) * (limit);
		const query = {
			attributes: [
				"id",
				"title",
				"summary",
				"has_video",
				"solar_term",
				"lunar_calendar",
				"lunar_festival",
				"cover",
				"effect_date",
				"published_at",
				"published_by",
				"created_by",
				"created_at",
				"status",
				"views",
				"updated_at",
				"updated_by"
			],
			order: [["effect_date", "DESC"], ["updated_at", "DESC"], ["id", "DESC"]],
			include: [{ attributes: ["username"], model: ctx.model.NmUsers, as: "createdBy" }, { attributes: ["username"], model: ctx.model.NmUsers, as: "updatedBy" }],
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

		if (title) query.where.title = { [Op.like]: `%${title}%` };
		const List = await ctx.model.DailyDietary.findAndCountAll(query);


		ctx.helper.handleSuccess(List);
	}

	/**
	 * @description 初始化一条并返回id
	 * @author bubao
	 * @date 2021-11-17 11:11:20
	 * @memberof NmDailyDietaryController
	 */
	async createDailyDietary() {
		const { ctx, app } = this;
		const { id: user_id } = ctx.nmJwtDecodeData;
		const daily_dietary_id = uuidv4();

		const edite_id = daily_dietary_id;
		const edite_by_id = user_id + "";
		const Minutes = 60;
		const redisLockPrefix = app.config.redisLockPrefix;
		await app.redis.set(`${redisLockPrefix}#lock#editeDailyDietary#${edite_id}`, edite_by_id, "EX", 60 * Minutes);
		const result = await ctx.model.DailyDietary.create({
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
	 * @memberof NmDailyDietaryController
	 */
	async saveDailyDietaryAsDraft() {
		const { ctx, app } = this;
		// * 检验参数
		try {
			ctx.validate({
				id: { type: "string" },
				title: { type: "string" },
				summary: { type: "string" },
				content: { type: "string" },
				cover: { type: "string" },
				effect_date: { type: "string", format: /\d{4}-\d{2}-\d{2}/ }
			}, ctx.request.body);
		} catch (error) {
			return ctx.throw(403, { errcode: 40001, res: { field: error.errors } });
		}
		// * 查锁
		const edite_id = ctx.request.body.id;
		const edite_by_id = ctx.nmJwtDecodeData.id;
		const redisLockPrefix = app.config.redisLockPrefix;
		const editorLockKey = `${redisLockPrefix}#lock#editeDailyDietary#${edite_id}`;
		const lockKey = `${redisLockPrefix}#lock#saveDailyDietary#${edite_id}`;
		const editeBy = ((await app.redis.get(editorLockKey)) || "") + "";

		// console.log("edite_by_id,editeBy", edite_by_id, editeBy);
		if (editeBy && edite_by_id !== editeBy) {
			// 被编辑
			ctx.throw(400, { errcode: 40040 });
		}
		// * 加锁
		const tagsLocked = await app.redis.set(lockKey, true, "EX", 5, "NX"); // info 连点拦截器
		if (tagsLocked !== "OK") {
			// info 操作太快
			ctx.throw(400, { errcode: 40044 });
		}
		const { title, content, cover, id: daily_dietary_id, summary, effect_date } = ctx.request.body;
		// solar_term     String? /// 农历节气
		// lunar_calendar String? /// 农历
		// lunar_festival String? /// 农历节日
		const { solar_term, lunar_calendar, lunar_festival } = ctx.service.lunar.lunarInfo(effect_date);

		console.log(" 农历节气", effect_date, solar_term, lunar_calendar, lunar_festival);
		await ctx.service.dailyDietary.updatedInfo({ title, content, cover, daily_dietary_id, summary, effect_date, status: 1, solar_term, lunar_calendar, lunar_festival });
		// * 删锁
		await app.redis.del(lockKey); // 先解锁连点拦截器
		await app.redis.del(editorLockKey); // 再解锁编辑拦截器
		ctx.helper.handleSuccess();
	}

	/**
	 * @description 保存为发布文章
	 * @author bubao
	 * @date 2021-11-17 12:11:55
	 * @memberof NmDailyDietaryController
	 */
	async saveDailyDietaryAsArticle() {
		const { ctx, app } = this;
		// * 检验参数
		try {
			ctx.validate({
				id: { type: "string" },
				title: { type: "string" },
				summary: { type: "string" },
				content: { type: "string" },
				cover: { type: "string" },
				effect_date: { type: "string", format: /^\d{4}-\d{2}-\d{2}$/ }
			}, ctx.request.body);
		} catch (error) {
			return ctx.throw(403, { errcode: 40001, res: { field: error.errors } });
		}

		const { title, content, cover, id: daily_dietary_id, summary, effect_date } = ctx.request.body;
		// * 查锁
		const edite_id = ctx.request.body.id;
		const edite_by_id = ctx.nmJwtDecodeData.id + "";
		const redisLockPrefix = app.config.redisLockPrefix;
		const lockKey = `${redisLockPrefix}#lock#saveailyDietary#${edite_id}`;
		const editorLockKey = `${redisLockPrefix}#lock#editeailyDietary#${edite_id}`;
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
		const { solar_term, lunar_calendar, lunar_festival } = ctx.service.lunar.lunarInfo(effect_date);
		console.log("solar_term, lunar_calendar, lunar_festival", effect_date, solar_term, lunar_calendar, lunar_festival);
		await ctx.service.dailyDietary.updatedInfo({ title, content, cover, daily_dietary_id, summary, effect_date, status: 2, solar_term, lunar_calendar, lunar_festival });
		// * 删锁
		await app.redis.del(lockKey);
		await app.redis.del(editorLockKey);
		ctx.helper.handleSuccess();
	}

	/**
	 * @description 获取一条的详细信息用于编辑
	 * @author bubao
	 * @date 2021-11-17 14:11:55
	 * @memberof NmDailyDietaryController
	 */
	async getDailyDietaryInfoToEdite() {
		const { ctx, app } = this;
		// * 检验参数
		try {
			ctx.validate({
				id: { type: "string" }
			}, ctx.request.query);
		} catch (error) {
			return ctx.throw(403, { errcode: 40001, res: { field: error.errors } });
		}
		// * 检查DailyDietary是否存在，检查DailyDietary是否为上架状态
		await ctx.service.dailyDietary.checkStatus(ctx.request.query.id);
		// * 查锁
		const edite_id = ctx.request.query.id;
		const edite_by_id = ctx.nmJwtDecodeData.id + "";
		const redisLockPrefix = app.config.redisLockPrefix;
		const lockKey = `${redisLockPrefix}#lock#saveDailyDietary#${edite_id}`;
		const editorLockKey = `${redisLockPrefix}#lock#editeDailyDietary#${edite_id}`;
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
		const DataInfo = await ctx.model.DailyDietary.findOne({
			attributes: [
				"id",
				"title",
				"content",
				"cover",
				"published_at",
				"published_by",
				"created_by",
				"created_at",
				"status",
				"summary",
				"effect_date",
				"updated_at",
				"updated_by"
			],
			where: {
				id: ctx.request.query.id
			},
			include: [
				{ attributes: ["username"], model: ctx.model.NmUsers, as: "createdBy" },
				{ attributes: ["username"], model: ctx.model.NmUsers, as: "updatedBy" },
				{ attributes: ["username"], model: ctx.model.NmUsers, as: "publishedBy" }
			]
			// raw: true
		});

		if (!DataInfo) {
			await app.redis.del(lockKey);
			ctx.throw(400, { errcode: 40027 });
		}
		// * 是发布状态，不可被编辑
		if (DataInfo.status === 2) {
			await app.redis.del(lockKey);
			ctx.throw(400, { errcode: 40026 });
		}
		await ctx.model.DailyDietary.update({
			status: DataInfo.status === 0 ? 0 : 4,
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
	 * @author bubao
	 * @date 2021-11-17 15:11:17
	 * @memberof NmDailyDietaryController
	 */
	async changeDailyDietaryStatus() {
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
		const DailyDietaryInfo = await ctx.model.DailyDietary.findOne({
			where: {
				id
			}
		});

		if (!DailyDietaryInfo) {
			ctx.throw(400, { errcode: 40027 });
		}
		if (DailyDietaryInfo.status === 0 || DailyDietaryInfo.status === 4) {
			// 文章处于编辑状态，不可保存
			ctx.throw(400, { errcode: 40040 });
		}
		// * 查锁
		const edite_id = ctx.request.query.id;
		const edite_by_id = ctx.nmJwtDecodeData.id + "";
		const redisLockPrefix = app.config.redisLockPrefix;
		const lockKey = `${redisLockPrefix}#lock#saveDailyDietary#${edite_id}`;
		const editeLockKey = `${redisLockPrefix}#lock#editeDailyDietary#${edite_id}`;

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
		await DailyDietaryInfo.update(updateQuery);
		// 解锁
		await app.redis.del(lockKey);
		await app.redis.del(editeLockKey);
		ctx.helper.handleSuccess();
	}

	/**
	 * @description 根据id删除
	 * @author bubao
	 * @date 2021-11-17 15:11:32
	 * @memberof NmDailyDietaryController
	 */
	async deleteDailyDietary() {
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
		const editeLockKey = `${redisLockPrefix}#lock#editeDailyDietary#${edite_id}`;
		// 检查轮播图id是否存在
		const DailyDietaryInfo = await ctx.model.DailyDietary.findOne({
			where: {
				id
			}
		});

		if (!DailyDietaryInfo) {
			ctx.throw(400, { errcode: 40027 });
		}
		await DailyDietaryInfo.destroy({
			force: true
		});
		const sourcePath = path.join(app.config.private.sourceBaseDirPath, `/upload/daily_dietary/${id}`);
		// * 删除本地资源
		await Exec("rm -rf " + sourcePath).catch(err => {
			console.error("删除失败" + err);
		});
		await app.redis.del(editeLockKey);

		// 返回ok
		ctx.helper.handleSuccess();
	}
}

module.exports = NmDailyDietaryController;
