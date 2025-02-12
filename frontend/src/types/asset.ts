export interface Asset {
  id: string;
  name: string;
  type: 'laptop' | 'desktop' | 'phone' | 'tablet' | 'other';
  serialNumber: string;
  purchaseDate: Date;
  assignedTo?: string;
  assignedDate?: Date;
  status: 'available' | 'assigned' | 'maintenance' | 'retired';
  notes?: string;
}
