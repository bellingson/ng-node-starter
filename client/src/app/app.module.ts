import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';

import { AppComponent } from './app.component';
import { GuestListComponent } from './guest/guest-list.component';
import {GuestService} from "./guest/guest.service";
import { GuestUpdateComponent } from './guest/guest-update.component';

@NgModule({
  declarations: [
    AppComponent,
    GuestListComponent,
    GuestUpdateComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    HttpModule
  ],
  providers: [ GuestService ],
  bootstrap: [AppComponent]
})
export class AppModule { }
