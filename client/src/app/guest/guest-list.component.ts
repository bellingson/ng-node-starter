import { Component, OnInit } from '@angular/core';
import {GuestService} from "./guest.service";

declare var jQuery: any;

import * as _ from 'lodash';
import * as moment from 'moment';


@Component({
  selector: 'app-guest-list',
  templateUrl: './guest-list.component.html',
  styleUrls: ['./guest-list.component.scss']
})
export class GuestListComponent implements OnInit {

  guests: Array<any>;

  selectedGuest: any;
  total: number;
  lastUpdate: any;

  constructor(private guestService: GuestService) { }

  ngOnInit() {
      this.fetchGuests();
  }

  fetchGuests() {

      this.guestService.lastUpdate()
          .subscribe(r => {
             this.lastUpdate = r.lastUpdate;
          });


      this.guestService.query()
          .subscribe(guests => {

              let now = moment();

              this.guests = _(guests)
                                .sortBy('start')
                                .map(guest => {

                                    guest.startM = moment(guest.start);
                                    guest.endM = moment(guest.end);
                                    guest.daysAway = guest.startM.diff(now,'days');

                                    console.log(moment(guest.start));



                                    return guest;
                                }).valueOf();

              // this.guests = _.sortBy(guests,'start');
              this.total = _(this.guests)
                             .filter(guest => guest.total != null)
                             .map(guest => parseFloat(guest.total) )
                             .sum();
          });
  }

  selectGuest(g) {

      this.selectedGuest = g;

      jQuery('.modal').modal('show');

  }

  updateGuest(g) {

      this.guestService.save(g)
          .subscribe(r => {

              this.fetchGuests();
              jQuery('.modal').modal('hide');

          });


  }

  refresh() {

      this.guestService
          .refreshCalendar()
          .subscribe(r => {
             this.fetchGuests();
          });

  }

  statusCss(g) {

      if(!g.bookingThankyou)
          return 'warning';

      if(!g.weekBeforeTrip && g.daysAway > 0 && g.daysAway <= 7) {
          return 'warning';
      }

      return '';
  }


}
