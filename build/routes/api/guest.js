"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var express = require("express");
var calendar_service_1 = require("../../service/calendar.service");
exports.router = express.Router();
var bodyParser = require('body-parser');
var _ = require("lodash");
var calendarService = new calendar_service_1.CalendarService();
/* GET home page. */
exports.router.get('/', function (req, res, next) {
    calendarService.loadGuestsFromDb().subscribe(function (guests) {
        res.send(guests);
    });
});
var jsonParser = bodyParser.json({ type: 'application/*+json' });
exports.router.put('/:guestId', jsonParser, function (req, res, next) {
    var guest = _.omit(req.body, '_id');
    console.log(guest);
    calendarService.updateGuest(guest)
        .subscribe(function (r) {
        res.send(r);
    });
});
