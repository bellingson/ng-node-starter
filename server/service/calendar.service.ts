import * as path from 'path';
import * as https from 'https';

import * as fs from 'fs';
import * as readline from 'readline';
import * as moment from 'moment';

const _ = require('lodash');

import { MongoClient } from 'mongodb';
import * as assert from 'assert';
import {Observable, Subject} from "rxjs";

import {Guest} from "./guest.model";

const OK = { message: 'ok' };

export class CalendarService {

    calendarUrl = 'https://www.airbnb.com/calendar/ical/18041639.ics?s=3d60c763ae291a18ce8f2637d95475e8';

    dbUrl = 'mongodb://localhost:27017/bnb';



    dataDirPath() {
        return path.join(__dirname,'../../data');
    }

    calendarCacheFilePath() {
        return path.join(this.dataDirPath(), '/ical.ics');
    }

    lastUpdate() {

        let stat = fs.statSync(this.calendarCacheFilePath());
        return stat.mtime;
    }

    refreshCalendar() : Promise<any> {

        return new Promise((resolve, reject) => {

            this.fetchCalendar()
                .then(this.writeCalendarToCache.bind(this))
                .then(this.importCalendarToDb.bind(this))
                .then(() => {
                    resolve(OK);
                })
                .catch(reject);
        });

    }


    fetchCalendar() {

        let file = this.calendarCacheFilePath();

        let options = {
            hostname:  'www.airbnb.com',
            path: '/calendar/ical/18041639.ics?s=3d60c763ae291a18ce8f2637d95475e8',
            headers: { 'User-Agent': 'Mac_OS_X/10.9.2 (13C64) CalendarAgent/176' }
        };

        console.log('fetch calendar');

        return new Promise((resolve, reject) => {

            let c = 0;

            https.get(options, res => {

                // console.log('statusCode:', res.statusCode);
                // console.log('headers:', res.headers);

                res.on('data', d => {

                    resolve(d.toString());
                });
            });
        });
    } // fetch calendar


    writeCalendarToCache(data: string) {

        console.log('got calendar');

        let file = this.calendarCacheFilePath();

        return new Promise((resolve, reject) => {

            fs.writeFile(file, data, 'utf8', (err) => {
                if(err) {
                    reject(err);
                    return;
                }
                resolve();
            });

        });

    }


    importCalendarToDb() {

        return new Promise((resolve, reject) => {

            const file = this.calendarCacheFilePath();

            this.readCalendarStream().then(events => {

                // hack to track items
                let processing = [];

                MongoClient.connect(this.dbUrl, (err, db) => {
                    assert.equal(null, err);
                    console.log("Connected successfully to server");

                    let guests = db.collection('guests');

                    _.each(events, event => {

                        processing.push(event);

                        this.insertOrUpdateGuestToDb(guests, event).then(() => {
                            _.remove(processing, event);

                            // hack to track items
                            if(processing.length == 0) {
                                db.close();
                                resolve();
                            }

                        });

                    });

                });

            });


        });
    }

    insertOrUpdateGuestToDb(guests, event) : Promise<void> {

        return new Promise<void>((resolve, reject) => {

            guests.find({code: event.code }).toArray((err, docs) => {

                if(docs.length == 0) {
                    guests.insertOne(event, (err, result) => {
                        // console.log(err);
                        resolve();
                    });
                } else {
                    resolve();
                }

            });
        });

    }

    loadGuestsFromDb() : Observable<Array<Guest>> {

        let r = new Subject<Array<any>>();

        MongoClient.connect(this.dbUrl, (err, db) => {
            assert.equal(null, err);
            console.log("Connected successfully to server");

            let guests = db.collection('guests');

            guests.find({}).toArray((err, docs) => {
                let guests = _.sortBy(docs, 'start');
                r.next(guests);
                r.complete();
                db.close();
            });

        });

        return r;
    }

    updateGuest(guest: Guest) : Observable<any> {

        let r = new Subject<any>();

        // console.log(guest);

        MongoClient.connect(this.dbUrl, (err, db) => {
            assert.equal(null, err);

            let guests = db.collection('guests');

            guests.updateOne({ uid: guest.uid }, guest, (err, ur) => {

                db.close();

                if(err) {
                    r.error(err);
                    r.complete();
                    return
                }

                r.next(OK);
                r.complete();

            });

        });
        
        return r;
    }


    readCalendarStream() {

        let file = this.calendarCacheFilePath();

        return new Promise((resolve, reject) => {

            let event;
            let guests = [];

            let rs = fs.createReadStream(file);
            let rl = readline.createInterface({input: rs});
            rl.on('line', line => {

                if(line === 'BEGIN:VEVENT') {
                    event = {};
                }

                if(line === 'END:VEVENT' && event.summary != 'Not available') {
                    if(event.start && event.end) {
                        event.days = event.end.diff(event.start,'days');
                        event.start = event.start.toDate();
                        event.end = event.end.toDate();
                    }

                    guests.push(event);
                }
                
                this.parseCalendarLineToEvent(line, event);

            });

            rl.on('close', () => {
                resolve(guests);
            });

        });

    }

    parseCalendarLineToEvent(line, event) {

        if(!event) return;

        if(_.startsWith(line,'DTSTART')) {
            event.start = this.parseDateFromCalLine(line);
        }

        if(_.startsWith(line,'DTEND')) {
            event.end = this.parseDateFromCalLine(line);
        }

        if(_.startsWith(line,'SUMMARY')) {
            this.parseSummaryFromCalLine(line, event);
        }

        if(_.startsWith(line,'UID')) {
            event.uid =  this.parseStringFromCalLine(line);
        }

        // bug due to multi line, but not really neaded
        // if(_.startsWith(line,'DESCRIPTION')) {
        //     event.description =  this.parseStringFromCalLine(line);
        // }

    }

    parseSummaryFromCalLine(line, event) {
        event.summary =  this.parseStringFromCalLine(line);
        let x = event.summary.lastIndexOf('(');
        if(x != -1) {
            event.code = event.summary.substr(x+1, event.summary.length-1);
            event.summary = event.summary.substr(0,x-1);
        }

    }


    parseStringFromCalLine(line) {

        const x = line.lastIndexOf(':');
        if(x == -1) {
            return null;
        }
        return line.substring(x+1);
    }


    parseDateFromCalLine(line) {

        const x = line.lastIndexOf(':');
        if(x == -1) {
            return null;
        }

        const dateStr = line.substring(x+1);

        // console.log(dateStr);

        return moment(dateStr, 'YYYYMMDD').local();


    }

    readCalendarFromCache() {

        let file = this.calendarCacheFilePath();

        return new Promise((resolve, reject) => {

                fs.readFile(file, 'utf8', (err, data) => {
                    resolve(data);
                });
            });

    }




}

