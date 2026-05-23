export interface Court {
  id: string;
  name: string;
  type: "Крытый корт" | "Открытый корт";
  address: string;
  price: number;
  rating: number;
  image: string;
  description: string;
  features: string[];
}

export interface Booking {
  id: string;
  courtId: string;
  courtName: string;
  userId: string;
  userEmail: string;
  userName: string;
  date: string; // YYYY-MM-DD
  timeSlots: string[]; // e.g. ['10:00', '11:00']
  hoursCount: number;
  totalPrice: number;
  bookingCode: string;
  createdAt: string; 
  status: "active" | "cancelled";
}

export interface BlockedDate {
  date: string; // YYYY-MM-DD
  reason: string;
  blockedBy: string;
}
