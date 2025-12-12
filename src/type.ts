// src/types.ts

export interface LoginUser {
    id: number;
    name: string;
    phone: string;
    email: string;
}

export interface Region {
    province: string;
    city: string;
    district: string;
    dong: string;
}

export interface ParkingLotLocation {
    lat: number;
    lng: number;
}

export interface ParkingLot {
    id: number;
    name: string;
    address: string;
    basePrice: number;
    region: Region;
    location: ParkingLotLocation;
}

export interface BookingInfo {
    parkingLot: ParkingLot;
    spaceId: number | null;
    spaceName: string | null; // 예: "C3-3F-01"
    startDateTime: string;    // "2025-12-10T09:00:00"
    endDateTime: string;      // "2025-12-10T18:00:00"
    totalPrice: number;
}
