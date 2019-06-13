const sequelize = require('sequelize');
const conn = new sequelize('postgres://localhost/chatapp');

module.exports = conn;