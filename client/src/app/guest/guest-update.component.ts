import { Component, OnInit, Input, OnChanges, SimpleChanges, Output, EventEmitter } from '@angular/core';

import { FormGroup, FormControl, Validators, FormBuilder } from '@angular/forms';

import {GuestService} from "./guest.service";

import * as _ from 'lodash';

@Component({
  selector: 'app-guest-update',
  templateUrl: './guest-update.component.html',
  styleUrls: ['./guest-update.component.scss']
})
export class GuestUpdateComponent implements OnInit, OnChanges {


  @Input() guest;

  @Output() update = new EventEmitter<any>();

  form: FormGroup;

  constructor(private guestService: GuestService, fb: FormBuilder) {

      this.form = fb.group({
          total: '',
          bookingThankyou: false,
          weekBeforeTrip: false,
          afterTrip: false
      });

  }

  ngOnInit() {
      
  }

    ngOnChanges(changes: SimpleChanges): void {
        if(this.guest) {
            this.form.reset();
            this.form.patchValue(this.guest);
        }
    }

    updateGuest() {

        _.assign(this.guest, this.form.value);

        this.update.emit(this.guest);

    }

}
