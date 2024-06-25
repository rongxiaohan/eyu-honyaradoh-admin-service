"use strict";

const Service = require("egg").Service;

class NmUserService extends Service {
	/**
	 * @description 通过id list查询 nmUser表 返回 Set {id:name}
	 * @author bubao
	 * @date 2021-11-19 09:11:51
	 * @param {array} [idList=[]] id list
	 * @return {Map} Map {id:name}
	 * @memberof NmUserService
	 */
	async findNmUserNameByIdList(idList = []) {
		const { ctx, app } = this;
		const Op = app.Sequelize.Op;

		if (!Array.isArray(idList)) {
			return new Map();
		}
		if (!idList.length) {
			return new Map();
		}
		const ListNameFromNmUser = await ctx.model.NmUsers.findAll({
			attributes: ["username", "id"],
			where: {
				id: { [Op.in]: idList }
			},
			raw: true
		});

		const ListNameMapFromNmUser = new Map();
		for (let index = 0; index < ListNameFromNmUser.length; index++) {
			const element = ListNameFromNmUser[index];
			ListNameMapFromNmUser.set(element.id, element.username);
		}
		return ListNameMapFromNmUser;
	}
}

module.exports = NmUserService;
