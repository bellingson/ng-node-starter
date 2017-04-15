import { Injectable } from '@angular/core';

import { Http } from '@angular/http';

import { Observable } from 'rxjs/Observable';

import 'rxjs/add/operator/map';


import * as _ from 'lodash';

@Injectable()
export class GuestService {

    baseUrl = '/api/guest';

  constructor(private http: Http) { }

  query() : Observable<Array<any>> {
     return this.http.get(this.baseUrl).map(r => r.json());
  }

  save(guest) : Observable<any> {

      let url = `${this.baseUrl}/${guest._id}`;

      return this.http.put(url, guest).map(r => r.json());

   }

   refreshCalendar() {
      let url = `${this.baseUrl}/refresh_calendar`;
      return this.http.post(url,{}).map(r => r.json());
   }

   lastUpdate() : Observable<any> {

      let url = this.baseUrl + '/last_update';
      return this.http.get(url).map(r => r.json());
   }


}
