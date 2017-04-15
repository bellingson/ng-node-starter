
import * as express from 'express';
import * as path from 'path';
import * as logger from 'morgan';
import * as cookieParser from 'cookie-parser';
import * as bodyParser from 'body-parser';

import { CalendarService } from './service/calendar.service';

import * as index from './routes/index';
import * as guestApi from './routes/api/guest-routes';

export const app = express();

app.set('views', path.join(__dirname, '../server/views'));
app.set('view engine', 'hbs');


// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
// app.use(express.static(path.join(__dirname, 'public')));


console.log(path.join(__dirname, 'app'));

app.use(express.static(path.join(__dirname, 'app')));

app.use('/', index.router);
app.use('/api/guest', guestApi.router);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});


const calendarService = new CalendarService();

// calendarService.importCalendarToDb()

