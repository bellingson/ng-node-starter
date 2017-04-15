import { Component, OnInit } from '@angular/core';
import {GuestService} from "./guest.service";

declare var jQuery: any;

import * as _ from 'lodash';

@Component({
  selector: 'app-guest-list',
  templateUrl: './guest-list.component.html',
  styleUrls: ['./guest-list.component.scss']
})
export class GuestListComponent implements OnInit {

  guests: Array<any>;

  selectedGuest: any;
  total: number;

  constructor(private guestService: GuestService) { }

  ngOnInit() {
      this.fetchGuests();
  }

  fetchGuests() {
      this.guestService.query()
          .subscribe(guests => {
              this.guests = _.sortBy(guests,'start');
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


}
