import * as express from 'express';

import { CalendarService } from '../../service/calendar.service';

export const router = express.Router();

var bodyParser = require('body-parser');

import * as _ from 'lodash';

const calendarService = new CalendarService();

/* GET home page. */
router.get('/',function(req, res, next) {

    calendarService.loadGuestsFromDb().subscribe(guests => {
        res.send(guests);
    });

});

var jsonParser = bodyParser.json({ type: 'application/*+json'});

router.put('/:guestId',jsonParser, function(req, res, next) {

    let guest = _.omit(req.body, '_id');

    console.log(guest);

    calendarService.updateGuest(guest)
        .subscribe(r => {
            res.send(r);
        });
    
});

router.post('/refresh_calendar',jsonParser, function(req, res, next) {

    calendarService.fetchCalendar().then(data => {

    });

});





