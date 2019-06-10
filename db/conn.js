const Sequelize = require('sequelize');
const conn = new Sequelize('postgres://postgres:root@127.0.0.1:53104/chatapp');

module.exports = conn;