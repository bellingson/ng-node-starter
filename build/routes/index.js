"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
exports.router = express.Router();
/* GET home page. */
exports.router.get('/', function (req, res, next) {
    res.render('index', { title: 'foo' });
});
