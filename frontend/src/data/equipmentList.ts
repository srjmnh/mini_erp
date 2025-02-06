export interface EquipmentItem {
  id: string;
  category: string;
  name: string;
}

export const equipmentList: EquipmentItem[] = [
  // Computer Equipment
  { id: 'laptop', category: 'Computer', name: 'Laptop' },
  { id: 'desktop', category: 'Computer', name: 'Desktop Computer' },
  { id: 'monitor', category: 'Computer', name: 'Monitor' },
  { id: 'keyboard', category: 'Computer', name: 'Keyboard' },
  { id: 'mouse', category: 'Computer', name: 'Mouse' },
  { id: 'docking_station', category: 'Computer', name: 'Docking Station' },
  
  // Mobile Devices
  { id: 'smartphone', category: 'Mobile', name: 'Smartphone' },
  { id: 'tablet', category: 'Mobile', name: 'Tablet' },
  
  // Office Equipment
  { id: 'desk', category: 'Furniture', name: 'Desk' },
  { id: 'chair', category: 'Furniture', name: 'Office Chair' },
  { id: 'filing_cabinet', category: 'Furniture', name: 'Filing Cabinet' },
  { id: 'whiteboard', category: 'Furniture', name: 'Whiteboard' },
  
  // Communication
  { id: 'headset', category: 'Communication', name: 'Headset' },
  { id: 'webcam', category: 'Communication', name: 'Webcam' },
  { id: 'phone', category: 'Communication', name: 'Desk Phone' },
  
  // Storage
  { id: 'external_drive', category: 'Storage', name: 'External Hard Drive' },
  { id: 'usb_drive', category: 'Storage', name: 'USB Flash Drive' },
  
  // Accessories
  { id: 'laptop_stand', category: 'Accessories', name: 'Laptop Stand' },
  { id: 'monitor_stand', category: 'Accessories', name: 'Monitor Stand' },
  { id: 'keyboard_pad', category: 'Accessories', name: 'Keyboard Pad' },
  
  // Other
  { id: 'other', category: 'Other', name: 'Other (Custom)' },
];
