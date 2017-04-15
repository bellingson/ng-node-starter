
export interface Guest {

    _id: string;
    summary: string;
    start: Date;
    end: Date;
    days: number;
    total: number;
    uid: string;
    code: string;

    bookingThankyou: boolean;
    weekBeforeTrip: boolean;
    afterTrip: boolean;

}