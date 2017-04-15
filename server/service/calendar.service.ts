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

    calendarJsonFilePath() {
        return path.join(this.dataDirPath(), '/ical.json');
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

            https.get(options, res => {

                res.on('data', d => {
                        resolve(d);
                });
            });
        });
    } // fetch calendar


    writeCalendarToCache(data: string) {

        console.log('got calendar');

        let file = this.calendarCacheFilePath();

        console.log(file);

        return new Promise((resolve, reject) => {

            fs.writeFile(file, 'utf8', data, (err) => {
                if(err) {
                    reject(err);
                    return;
                }
                resolve();
            });

        });

    }


    readCalendarFromJson() {

        return new Promise((resolve, reject) => {

            let file = this.calendarJsonFilePath();

            fs.readFile(file, 'utf8', (err, data) => {

                resolve(JSON.parse(data));
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

            guests.find({uid: event.uid }).toArray((err, docs) => {

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

            console.log('start update...');

            guests.updateOne({ uid: guest.uid }, guest, (err, ur) => {

                console.log('update... complete');

                console.log(err);


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



    translateCalendarToJson() {

        let file = this.calendarJsonFilePath();

        return new Promise((resolve, reject) => {

            this.readCalendarStream().then(events => {

                let json = JSON.stringify(events, null, '\t');
                fs.writeFile(file, json, err => {
                      resolve();
                });

            }).catch(reject);


        });
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
            event.summary =  this.parseStringFromCalLine(line);
        }

        if(_.startsWith(line,'UID')) {
            event.uid =  this.parseStringFromCalLine(line);
        }

        // bug due to multi line, but not really neaded
        // if(_.startsWith(line,'DESCRIPTION')) {
        //     event.description =  this.parseStringFromCalLine(line);
        // }

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

    calendarData() {

        let file = this.calendarCacheFilePath();

        return new Promise((resolve, reject) => {

                fs.stat(file, stat =>   {
                    console.log(stat);
                    if(stat.errno == -2) {
                        this.fetchCalendar()
                            .then(this.writeCalendarToCache.bind(this))
                            .then(this.readCalendarFromCache)
                            .then(resolve);
                    } else {
                        this.readCalendarFromCache()
                            .then(resolve);
                    }
                });

            });




    }


}

