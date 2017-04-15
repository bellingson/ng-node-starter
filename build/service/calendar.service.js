"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path = require("path");
var https = require("https");
var fs = require("fs");
var readline = require("readline");
var moment = require("moment");
var _ = require('lodash');
var mongodb_1 = require("mongodb");
var assert = require("assert");
var rxjs_1 = require("rxjs");
var OK = { message: 'ok' };
var CalendarService = (function () {
    function CalendarService() {
        this.calendarUrl = 'https://www.airbnb.com/calendar/ical/18041639.ics?s=3d60c763ae291a18ce8f2637d95475e8';
        this.dbUrl = 'mongodb://localhost:27017/bnb';
    }
    CalendarService.prototype.dataDirPath = function () {
        return path.join(__dirname, '../../data');
    };
    CalendarService.prototype.calendarCacheFilePath = function () {
        return path.join(this.dataDirPath(), '/ical.ics');
    };
    CalendarService.prototype.lastUpdate = function () {
        var stat = fs.statSync(this.calendarCacheFilePath());
        return stat.mtime;
    };
    CalendarService.prototype.refreshCalendar = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            _this.fetchCalendar()
                .then(_this.writeCalendarToCache.bind(_this))
                .then(_this.importCalendarToDb.bind(_this))
                .then(function () {
                resolve(OK);
            })
                .catch(reject);
        });
    };
    CalendarService.prototype.fetchCalendar = function () {
        var file = this.calendarCacheFilePath();
        var options = {
            hostname: 'www.airbnb.com',
            path: '/calendar/ical/18041639.ics?s=3d60c763ae291a18ce8f2637d95475e8',
            headers: { 'User-Agent': 'Mac_OS_X/10.9.2 (13C64) CalendarAgent/176' }
        };
        console.log('fetch calendar');
        return new Promise(function (resolve, reject) {
            var c = 0;
            https.get(options, function (res) {
                // console.log('statusCode:', res.statusCode);
                // console.log('headers:', res.headers);
                res.on('data', function (d) {
                    resolve(d.toString());
                });
            });
        });
    }; // fetch calendar
    CalendarService.prototype.writeCalendarToCache = function (data) {
        console.log('got calendar');
        var file = this.calendarCacheFilePath();
        return new Promise(function (resolve, reject) {
            fs.writeFile(file, data, 'utf8', function (err) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    };
    CalendarService.prototype.importCalendarToDb = function () {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var file = _this.calendarCacheFilePath();
            _this.readCalendarStream().then(function (events) {
                // hack to track items
                var processing = [];
                mongodb_1.MongoClient.connect(_this.dbUrl, function (err, db) {
                    assert.equal(null, err);
                    console.log("Connected successfully to server");
                    var guests = db.collection('guests');
                    _.each(events, function (event) {
                        processing.push(event);
                        _this.insertOrUpdateGuestToDb(guests, event).then(function () {
                            _.remove(processing, event);
                            // hack to track items
                            if (processing.length == 0) {
                                db.close();
                                resolve();
                            }
                        });
                    });
                });
            });
        });
    };
    CalendarService.prototype.insertOrUpdateGuestToDb = function (guests, event) {
        return new Promise(function (resolve, reject) {
            guests.find({ code: event.code }).toArray(function (err, docs) {
                if (docs.length == 0) {
                    guests.insertOne(event, function (err, result) {
                        // console.log(err);
                        resolve();
                    });
                }
                else {
                    resolve();
                }
            });
        });
    };
    CalendarService.prototype.loadGuestsFromDb = function () {
        var r = new rxjs_1.Subject();
        mongodb_1.MongoClient.connect(this.dbUrl, function (err, db) {
            assert.equal(null, err);
            console.log("Connected successfully to server");
            var guests = db.collection('guests');
            guests.find({}).toArray(function (err, docs) {
                var guests = _.sortBy(docs, 'start');
                r.next(guests);
                r.complete();
                db.close();
            });
        });
        return r;
    };
    CalendarService.prototype.updateGuest = function (guest) {
        var r = new rxjs_1.Subject();
        // console.log(guest);
        mongodb_1.MongoClient.connect(this.dbUrl, function (err, db) {
            assert.equal(null, err);
            var guests = db.collection('guests');
            guests.updateOne({ uid: guest.uid }, guest, function (err, ur) {
                db.close();
                if (err) {
                    r.error(err);
                    r.complete();
                    return;
                }
                r.next(OK);
                r.complete();
            });
        });
        return r;
    };
    CalendarService.prototype.readCalendarStream = function () {
        var _this = this;
        var file = this.calendarCacheFilePath();
        return new Promise(function (resolve, reject) {
            var event;
            var guests = [];
            var rs = fs.createReadStream(file);
            var rl = readline.createInterface({ input: rs });
            rl.on('line', function (line) {
                if (line === 'BEGIN:VEVENT') {
                    event = {};
                }
                if (line === 'END:VEVENT' && event.summary != 'Not available') {
                    if (event.start && event.end) {
                        event.days = event.end.diff(event.start, 'days');
                        event.start = event.start.toDate();
                        event.end = event.end.toDate();
                    }
                    guests.push(event);
                }
                _this.parseCalendarLineToEvent(line, event);
            });
            rl.on('close', function () {
                resolve(guests);
            });
        });
    };
    CalendarService.prototype.parseCalendarLineToEvent = function (line, event) {
        if (!event)
            return;
        if (_.startsWith(line, 'DTSTART')) {
            event.start = this.parseDateFromCalLine(line);
        }
        if (_.startsWith(line, 'DTEND')) {
            event.end = this.parseDateFromCalLine(line);
        }
        if (_.startsWith(line, 'SUMMARY')) {
            this.parseSummaryFromCalLine(line, event);
        }
        if (_.startsWith(line, 'UID')) {
            event.uid = this.parseStringFromCalLine(line);
        }
        // bug due to multi line, but not really neaded
        // if(_.startsWith(line,'DESCRIPTION')) {
        //     event.description =  this.parseStringFromCalLine(line);
        // }
    };
    CalendarService.prototype.parseSummaryFromCalLine = function (line, event) {
        event.summary = this.parseStringFromCalLine(line);
        var x = event.summary.lastIndexOf('(');
        if (x != -1) {
            event.code = event.summary.substr(x + 1, event.summary.length - 1);
            event.summary = event.summary.substr(0, x - 1);
        }
    };
    CalendarService.prototype.parseStringFromCalLine = function (line) {
        var x = line.lastIndexOf(':');
        if (x == -1) {
            return null;
        }
        return line.substring(x + 1);
    };
    CalendarService.prototype.parseDateFromCalLine = function (line) {
        var x = line.lastIndexOf(':');
        if (x == -1) {
            return null;
        }
        var dateStr = line.substring(x + 1);
        // console.log(dateStr);
        return moment(dateStr, 'YYYYMMDD').local();
    };
    CalendarService.prototype.readCalendarFromCache = function () {
        var file = this.calendarCacheFilePath();
        return new Promise(function (resolve, reject) {
            fs.readFile(file, 'utf8', function (err, data) {
                resolve(data);
            });
        });
    };
    return CalendarService;
}());
exports.CalendarService = CalendarService;
