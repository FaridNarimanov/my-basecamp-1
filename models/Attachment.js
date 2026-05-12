const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Attachment = sequelize.define('Attachment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    project_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    file_name: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    file_path: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    uploaded_by: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    tableName: 'attachments',
    timestamps: false
});

module.exports = Attachment;
