/**
 * @Description:
 * @Author: bubao
 * @Date: 2023-11-14 18:37:11
 * @LastEditors: bubao
 * @LastEditTime: 2023-11-17 19:58:27
 */
"use strict";


/**
 *
 * @param {Egg.Application} app
 * @returns
 */
module.exports = app => {
	const DataTypes = app.Sequelize;

	const Model = app.model.define("nm_users", {
		id: {
			type: DataTypes.STRING(191),
			allowNull: false,
			primaryKey: true
		},
		username: {
			type: DataTypes.STRING(191),
			allowNull: true
		},
		role: {
			type: DataTypes.STRING(191),
			allowNull: false
		},
		head_portrait: {
			type: DataTypes.STRING(191),
			allowNull: true
		},
		email: {
			type: DataTypes.STRING(191),
			allowNull: true,
			unique: true
		},
		created_at: {
			type: DataTypes.DATE,
			allowNull: false,
			defaultValue: app.Sequelize.literal("CURRENT_TIMESTAMP")
		},
		updated_at: {
			type: DataTypes.DATE,
			allowNull: false,
			defaultValue: app.Sequelize.literal("CURRENT_TIMESTAMP")
		},
		created_by: {
			type: DataTypes.STRING(191),
			allowNull: true
		},
		status: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: "1"
		},
		updated_by: {
			type: DataTypes.STRING(191),
			allowNull: true
		}
	}, {
		tableName: "nm_users",
		timestamps: false,
		freezeTableName: true
	});

	Model.associate = function() {
		app.model.NmUsers.belongsTo(app.model.NmUsers, {
			as: "createdBy",
			foreignKey: "created_by"
		});
		app.model.NmUsers.belongsTo(app.model.NmUsers, {
			as: "updatedBy",
			foreignKey: "updated_by"
		});
	};

	return Model;
};
