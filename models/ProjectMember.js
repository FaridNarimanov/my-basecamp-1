const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProjectMember = sequelize.define('ProjectMember', {
    project_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false
    },
    user_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false
    },
    role: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
            isIn: [['admin', 'viewer']]
        }
    }
}, {
    tableName: 'project_members',
    timestamps: false
});

module.exports = ProjectMember;
