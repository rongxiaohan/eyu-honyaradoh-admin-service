/**
 * @Description:
 * @Author: bubao
 * @Date: 2023-11-14 18:37:11
 * @LastEditors: bubao
 * @LastEditTime: 2023-11-17 19:58:10
 */
"use strict";


/**
 *
 * @param {Egg.Application} app
 * @returns
 */
module.exports = app => {
	const DataTypes = app.Sequelize;

	const Model = app.model.define("health_classification", {
		id: {
			type: DataTypes.STRING(191),
			allowNull: false,
			primaryKey: true
		},
		name: {
			type: DataTypes.STRING(191),
			allowNull: false,
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
		updated_by: {
			type: DataTypes.STRING(191),
			allowNull: true
		}
	}, {
		tableName: "health_classification",
		timestamps: false,
		freezeTableName: true
	});

	Model.associate = function() {
		app.model.HealthClassification.belongsTo(app.model.NmUsers, {
			as: "createdBy",
			foreignKey: "created_by"
		});
		app.model.HealthClassification.belongsTo(app.model.NmUsers, {
			as: "updatedBy",
			foreignKey: "updated_by"
		});

	};

	return Model;
};
