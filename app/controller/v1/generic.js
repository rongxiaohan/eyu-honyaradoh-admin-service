/**
 * @Description:
 * @Author: bubao
 * @Date: 2023-11-14 16:42:57
 * @LastEditors: bubao
 * @LastEditTime: 2023-11-15 15:09:55
 */
"use strict";

const Controller = require("egg").Controller;


class GenericController extends Controller {
	async fallback() {
		const { ctx } = this;
		// * 检查参数
		try {
			ctx.validate({
				id: { type: "string" },
				tag: {
					type: "enum",
					values: [
						"dailyDietary"
					]
				}
			}, ctx.request.body);
		} catch (error) {
			return ctx.throw(403, { errcode: 40001, res: { field: error.errors } });
		}
		const { tag, id } = ctx.request.body;
		const edite_by_id = ctx.nmJwtDecodeData.id + "";
		// * 分支选择
		await ctx.service[tag].fallback(id, edite_by_id);
		ctx.helper.handleSuccess();
	}
}

module.exports = GenericController;
