export type StaffLocationInput = {
  userId: string;
  latitude: number;
  longitude: number;
  timestamp?: number;
};

export type StaffLocation = {
  userId: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  receivedAt: number;
};
