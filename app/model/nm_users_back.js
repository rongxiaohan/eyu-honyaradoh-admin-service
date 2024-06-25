"use strict";


/**
 *
 * @param {Egg.Application} app
 * @returns
 */
module.exports = app => {
	const DataTypes = app.Sequelize;

	const Model = app.model.define("nm_users_back", {
		id: {
			type: DataTypes.STRING(191),
			allowNull: false,
			primaryKey: true
		},
		nm_user_id: {
			type: DataTypes.STRING(191),
			allowNull: false
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
			allowNull: true
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
		deleted_at: {
			type: DataTypes.DATE,
			allowNull: false,
			defaultValue: app.Sequelize.literal("CURRENT_TIMESTAMP")
		},
		deleted_by: {
			type: DataTypes.STRING(191),
			allowNull: false
		}
	}, {
		tableName: "nm_users_back",
		timestamps: false,
		freezeTableName: true
	});

	Model.associate = function() {

	};

	return Model;
};
