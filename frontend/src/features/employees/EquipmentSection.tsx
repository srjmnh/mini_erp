import React, { useState } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  TextField,
  MenuItem,
  Grid,
} from '@mui/material';
import {
  Edit as EditIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { equipmentList } from '@/data/equipmentList';

interface EquipmentItem {
  id: string;
  name: string;
  serialNumber?: string;
  notes?: string;
}

interface EquipmentSectionProps {
  equipment: EquipmentItem[];
  onSave: (equipment: EquipmentItem[]) => void;
}

export default function EquipmentSection({ equipment, onSave }: EquipmentSectionProps) {
  const [open, setOpen] = useState(false);
  const [editedEquipment, setEditedEquipment] = useState<EquipmentItem[]>(equipment);
  const [newItem, setNewItem] = useState<EquipmentItem>({
    id: '',
    name: '',
    serialNumber: '',
    notes: '',
  });

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleSave = () => {
    onSave(editedEquipment);
    handleClose();
  };

  const handleAddItem = () => {
    if (newItem.id) {
      setEditedEquipment([...editedEquipment, newItem]);
      setNewItem({ id: '', name: '', serialNumber: '', notes: '' });
    }
  };

  const handleDeleteItem = (index: number) => {
    const newEquipment = [...editedEquipment];
    newEquipment.splice(index, 1);
    setEditedEquipment(newEquipment);
  };

  const handleItemChange = (index: number, field: keyof EquipmentItem, value: string) => {
    const newEquipment = [...editedEquipment];
    newEquipment[index] = { ...newEquipment[index], [field]: value };
    setEditedEquipment(newEquipment);
  };

  // Group equipment by category
  const groupedEquipment = equipmentList.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof equipmentList>);

  return (
    <>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Equipment</Typography>
        <IconButton onClick={handleOpen}>
          <EditIcon />
        </IconButton>
      </Box>

      <List>
        {equipment.length === 0 ? (
          <ListItem>
            <ListItemText primary="No equipment assigned" />
          </ListItem>
        ) : (
          equipment.map((item, index) => (
            <ListItem key={index}>
              <ListItemText
                primary={item.name}
                secondary={
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {item.serialNumber && (
                      <Chip label={`S/N: ${item.serialNumber}`} size="small" variant="outlined" />
                    )}
                    {item.notes && (
                      <Typography variant="body2" color="text.secondary">
                        {item.notes}
                      </Typography>
                    )}
                  </Box>
                }
              />
            </ListItem>
          ))
        )}
      </List>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>Edit Equipment</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>Add New Equipment</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  label="Equipment Type"
                  value={newItem.id}
                  onChange={(e) => {
                    const selected = equipmentList.find(item => item.id === e.target.value);
                    if (selected) {
                      setNewItem({
                        ...newItem,
                        id: selected.id,
                        name: selected.name,
                      });
                    }
                  }}
                >
                  {Object.entries(groupedEquipment).map(([category, items]) => [
                    <MenuItem key={category} disabled>
                      {category}
                    </MenuItem>,
                    ...items.map(item => (
                      <MenuItem key={item.id} value={item.id} sx={{ pl: 4 }}>
                        {item.name}
                      </MenuItem>
                    ))
                  ])}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Serial Number"
                  value={newItem.serialNumber}
                  onChange={(e) => setNewItem({ ...newItem, serialNumber: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  value={newItem.notes}
                  onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddItem}
                  disabled={!newItem.id}
                >
                  Add Equipment
                </Button>
              </Grid>
            </Grid>
          </Box>

          <Typography variant="subtitle1" gutterBottom>Current Equipment</Typography>
          <List>
            {editedEquipment.map((item, index) => (
              <ListItem key={index}>
                <ListItemText
                  primary={
                    <TextField
                      fullWidth
                      value={item.name}
                      onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                    />
                  }
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Serial Number"
                        value={item.serialNumber}
                        onChange={(e) => handleItemChange(index, 'serialNumber', e.target.value)}
                        sx={{ mb: 1 }}
                      />
                      <TextField
                        fullWidth
                        size="small"
                        label="Notes"
                        value={item.notes}
                        onChange={(e) => handleItemChange(index, 'notes', e.target.value)}
                      />
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" onClick={() => handleDeleteItem(index)}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
