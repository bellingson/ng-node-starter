

import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';


export class MyService {

    dbUrl = 'mongodb://localhost:27017/test';

    constructor() { }

    list() : Observable<Array<any>> {
        
        return Observable.of([{ message: 'Hello World'}]);
    }


}

