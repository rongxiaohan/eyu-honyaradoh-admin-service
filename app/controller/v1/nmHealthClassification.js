"use strict";

const Controller = require("egg").Controller;
const { v4: uuidV4 } = require("uuid");

class NmHealthClassificationController extends Controller {
	/**
	 * 列表
	 */
	async getAll() {
		const { ctx } = this;

		const query = {
			attributes: [
				"id", // "id"
				"name", // 名称"
				"created_at", // "创建时间"
				"updated_at", // "更新时间"
				"created_by", // "创建人nm id"
				"updated_by" // "更新人的nm id"
			],
			include: [{
				attributes: ["username"], model: ctx.model.NmUsers, as: "createdBy" }, { attributes: ["username"], model: ctx.model.NmUsers, as: "updatedBy" }],
			order: [["id", "DESC"], ["updated_at", "DESC"]]
			// raw: true
		};
		const List = await ctx.model.HealthClassification.findAndCountAll(query);
		ctx.helper.handleSuccess(List);
	}

	/**
	 * @description 创建
	 */
	async createOne() {
		const { ctx } = this;
		const { id: user_id } = ctx.nmJwtDecodeData;
		const id = uuidV4();
		try {
			ctx.validate({
				name: { type: "string" }
			}, ctx.request.body);
		} catch (error) {
			return ctx.throw(403, { errcode: 40001, res: { field: error.errors } });
		}
		const { name } = ctx.request.body;
		const result = await ctx.model.HealthClassification.create({
			id,
			name,
			created_by: user_id,
			updated_by: user_id
		});

		ctx.helper.handleSuccess(result.dataValues);
	}

	/**
	 * @description 更新
	 */
	async updateOne() {
		const { ctx } = this;
		const { id: user_id } = ctx.nmJwtDecodeData;
		// * 检验参数
		try {
			ctx.validate({
				name: { type: "string" },
				id: { type: "string" }
			}, ctx.request.body);
		} catch (error) {
			return ctx.throw(403, { errcode: 40001, res: { field: error.errors } });
		}

		const { id, name } = ctx.request.body;

		const DataInfo = await ctx.model.HealthClassification.findOne({ where: { id } });
		if (!DataInfo) {
			ctx.throw(400, { errcode: 40027 });
		}

		// * 查锁
		const result = await DataInfo.update({
			name,
			updated_by: user_id
		});
		ctx.helper.handleSuccess(result.dataValues);
	}

	/**
	 * 删除
	 */
	async deleteOne() {
		const { ctx } = this;
		// * 检验参数
		try {
			ctx.validate({
				id: { type: "string" }
			}, ctx.request.body);
		} catch (error) {
			return ctx.throw(403, { errcode: 40001, res: { field: error.errors } });
		}

		const { id } = ctx.request.body;
		const DataInfo = await ctx.model.HealthClassification.findOne({ where: { id } });
		if (!DataInfo) {
			ctx.throw(400, { errcode: 40027 });
		}

		const count = await ctx.model.Health.count({
			where: {
				health_classification_id: id
			}
		});
		if (count === 0) {
			await ctx.model.HealthClassification.destroy({
				where: { id },
				force: true
			});
			ctx.helper.handleSuccess();
		} else {
			ctx.throw(400, { errcode: 40025 });
		}

	}
}

module.exports = NmHealthClassificationController;
