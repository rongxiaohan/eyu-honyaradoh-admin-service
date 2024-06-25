/**
 * @Description:
 * @Author: bubao
 * @Date: 2023-11-15 17:30:01
 * @LastEditors: bubao
 * @LastEditTime: 2023-11-15 17:37:07
 */
"use strict";

const Service = require("egg").Service;
const moment = require("moment");
class HealthService extends Service {
	/**
	 * 更新数据
	 * @param {title:string, content:string, cover:string, id, summary:string, status: number, health_classification_id:string} props xx
	 */
	async updatedInfo(props) {
		const { ctx, app } = this;
		let { id, ...updateQuery } = props;
		const { status } = props;
		const redisLockPrefix = app.config.redisLockPrefix;
		const lockKey = `${redisLockPrefix}#lock#saveHealth#${id}`;
		updateQuery = {
			...updateQuery,
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
		await this.checkStatus(id);

		// * 更新数据库
		await ctx.model.Health.update(updateQuery, {
			where: {
				id
			}
		});
	}

	/**
	 * @description 检查是否存在,状态
	 * @param {string} id id
	 */
	async checkStatus(id) {
		const { ctx, app } = this;
		// * 检查数据库是否存在该数据
		const DataInfo = await ctx.model.Health.findOne({
			attributes: ["id", "status"],
			where: {
				id
			},
			raw: true
		});
		const redisLockPrefix = app.config.redisLockPrefix;
		const lockKey = `${redisLockPrefix}#lock#saveHealth#${id}`;
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
}

module.exports = HealthService;
