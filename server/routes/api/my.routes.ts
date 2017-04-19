import * as express from 'express';

import { MyService } from '../../service/my.service';

export const router = express.Router();

var bodyParser = require('body-parser');
var jsonParser = bodyParser.json({ type: 'application/*+json'});


const myService = new MyService();

/* GET home page. */
router.get('/', jsonParser, (req, res, next) => {

    myService.list().subscribe(r => {
       res.send(r);
    });

});


