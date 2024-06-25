/**
 * @Description:
 * @Author: bubao
 * @Date: 2023-11-14 18:37:11
 * @LastEditors: bubao
 * @LastEditTime: 2023-11-17 19:58:16
 */
"use strict";


/**
 *
 * @param {Egg.Application} app
 * @returns
 */
module.exports = app => {
	const DataTypes = app.Sequelize;

	const Model = app.model.define("health", {
		id: {
			type: DataTypes.STRING(191),
			allowNull: false,
			primaryKey: true
		},
		title: {
			type: DataTypes.STRING(191),
			allowNull: true
		},
		cover: {
			type: DataTypes.STRING(191),
			allowNull: true
		},
		summary: {
			type: DataTypes.TEXT(),
			allowNull: true
		},
		content: {
			type: DataTypes.TEXT(),
			allowNull: true
		},
		has_video: {
			type: DataTypes.INTEGER(1),
			allowNull: false,
			defaultValue: "0"
		},
		views: {
			type: DataTypes.BIGINT,
			allowNull: false,
			defaultValue: "0"
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
		},
		published_at: {
			type: DataTypes.DATE,
			allowNull: true
		},
		published_by: {
			type: DataTypes.STRING(191),
			allowNull: true
		},
		health_classification_id: {
			type: DataTypes.STRING(191),
			allowNull: true,
			references: {
				model: "health_classification",
				key: "id"
			}
		}
	}, {
		tableName: "health",
		timestamps: false,
		freezeTableName: true
	});

	Model.associate = function() {
		app.model.Health.belongsTo(app.model.HealthClassification, {
			as: "healthClassification",
			foreignKey: "health_classification_id"
		});
		app.model.Health.belongsTo(app.model.NmUsers, {
			as: "createdBy",
			foreignKey: "created_by"
		});
		app.model.Health.belongsTo(app.model.NmUsers, {
			as: "updatedBy",
			foreignKey: "updated_by"
		});
		app.model.Health.belongsTo(app.model.NmUsers, {
			as: "publishedBy",
			foreignKey: "published_by"
		});
	};

	return Model;
};
