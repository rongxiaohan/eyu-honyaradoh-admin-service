"use strict";

const Service = require("egg").Service;
const moment = require("moment");
const path = require("path");

const util = require("util");
const Exec = util.promisify(require("child_process").exec);
// const path = require("path");
// const fs = require("fs");
// const util = require("util");
// const fsMkdir = util.promisify(fs.mkdir);
// const fsWriteFile = util.promisify(fs.writeFile);
// const fsStat = util.promisify(fs.stat);
// const readdirPromise = util.promisify(fs.readdir);
// const fsReadFile = util.promisify(fs.readFile);
// const _ = require("lodash");

class DailyDietaryService extends Service {
	/**
	 * @description 在编辑页面时保存为草稿和发布
	 * @author bubao
	 * @date 2021-11-17 13:11:45
	 * @param {{ title:string, content:string, cover:string, daily_dietary_id:string, summary:string, effect_date:string, status: nymber, solar_term:string, lunar_calendar:string, lunar_festival:string }} props title: 标题，content: 文件路径路由，cover：封面，policy_id：policy_id ，status：1草稿 2发布
	 * @return {boolean} 完成
	 * @memberof DailyDietaryService
	 */
	async updatedInfo(props) {
		const { ctx, app } = this;
		const { daily_dietary_id, status } = props;

		const redisLockPrefix = app.config.redisLockPrefix;
		const lockKey = `${redisLockPrefix}#lock#saveDailyDietary#${daily_dietary_id}`;
		let updateQuery = {
			...props,
			updated_by: ctx.nmJwtDecodeData.id
		};
		// 发布，更新发布人信息
		if (status === 2) {
			if (ctx.nmJwtDecodeData.role === "R") {
				// 录入员不允许发布
				await app.redis.del(lockKey);

				ctx.throw(401, 40023);
			}
			updateQuery = {
				...updateQuery,
				published_at: moment().valueOf(),
				published_by: ctx.nmJwtDecodeData.id
			};
		}

		// * 检查数据是否存在，且为非上架状态
		await this.checkStatus(daily_dietary_id);

		// * 更新数据库
		await ctx.model.DailyDietary.update(updateQuery, {
			where: {
				id: daily_dietary_id
			}
		});
	}

	/**
	 * @description 检查是否存在,状态
	 * @param {string} id id
	 * @memberof DailyDietaryService
	 */
	async checkStatus(id) {
		const { ctx, app } = this;
		// * 检查数据库是否存在该数据
		const DataInfo = await ctx.model.DailyDietary.findOne({
			attributes: ["id", "status"],
			where: {
				id
			},
			raw: true
		});
		const redisLockPrefix = app.config.redisLockPrefix;
		const lockKey = `${redisLockPrefix}#lock#saveDailyDietary#${id}`;
		if (!DataInfo) {
			// * 不存在了
			await app.redis.del(lockKey);
			ctx.throw(400, { errcode: 40027 });
		}
		// * 检查该设备是否正在非上架状态
		if (DataInfo.status === 2) {
			// * 需要先下架
			await app.redis.del(lockKey);
			ctx.throw(400, { errcode: 40026 });
		}
	}


	async fallback(id, edite_by_id) {
		const { app, ctx } = this;
		// 检查编辑者
		const redisLockPrefix = app.config.redisLockPrefix;
		const lockKey = `${redisLockPrefix}#lock#editeDailyDietary#${id}`;

		const editeBy = ((await app.redis.get(lockKey)) || "") + "";
		// console.log("edite_by_id,editeBy", edite_by_id, editeBy);
		if (editeBy && edite_by_id !== editeBy) {
			// 被编辑
			ctx.throw(400, { errcode: 40040 });
		}
		// 检查数据状态
		const DataInfo = await ctx.model.DailyDietary.findOne({
			where: {
				id
			},
			raw: true
		});
		if (!DataInfo) {
			ctx.throw(400, { errcode: 40027 });
		}
		if (DataInfo.status === 1 || DataInfo.status === 2 || DataInfo.status === 3) {
			// 文章处于草稿，发布，下架，不可保存
			return;
		}
		// console.log("DataInfo.status", DataInfo.status);
		if (DataInfo.status === 0) {
			await ctx.model.DailyDietary.destroy({
				where: {
					id
				},
				force: true
			});
			const sourcePath = path.join(app.config.private.sourceBaseDirPath, `/upload/daily_dietary/${id}`);
			// * 删除本地资源
			await Exec("rm -rf " + sourcePath).catch(err => {
				console.error("删除失败" + err);
			});
			// * 删锁

		} else {
			await ctx.model.DailyDietary.update({
				status: 1
			}, {
				where: {
					id
				}
			});
		}
		// 修改状态
		await app.redis.del(lockKey);
		return;
	}
}

module.exports = DailyDietaryService;
