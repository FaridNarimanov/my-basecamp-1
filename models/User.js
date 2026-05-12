const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    email: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    role: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: 'user',
        validate: {
            isIn: [['user', 'admin']]
        }
    },
    profile_pic: {
        type: DataTypes.TEXT
    },
    username: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true
    }
}, {
    tableName: 'users',
    timestamps: false
});

module.exports = User;
