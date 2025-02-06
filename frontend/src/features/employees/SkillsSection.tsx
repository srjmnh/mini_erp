import React, { useState } from 'react';
import {
  Box,
  Chip,
  Typography,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete,
  Tab,
  Tabs,
} from '@mui/material';
import { Edit as EditIcon, Add as AddIcon } from '@mui/icons-material';
import { skillCategories } from '@/data/skillsList';

interface SkillsSectionProps {
  skills: string[];
  onSave: (skills: string[]) => void;
}

export default function SkillsSection({ skills, onSave }: SkillsSectionProps) {
  const [open, setOpen] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>(skills);
  const [activeCategory, setActiveCategory] = useState(0);
  const [customSkill, setCustomSkill] = useState('');

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleSave = () => {
    onSave(selectedSkills);
    handleClose();
  };

  const handleSkillDelete = (skillToDelete: string) => {
    setSelectedSkills(selectedSkills.filter(skill => skill !== skillToDelete));
  };

  const handleAddCustomSkill = () => {
    if (customSkill && !selectedSkills.includes(customSkill)) {
      setSelectedSkills([...selectedSkills, customSkill]);
      setCustomSkill('');
    }
  };

  return (
    <>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Skills</Typography>
        <IconButton onClick={handleOpen}>
          <EditIcon />
        </IconButton>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {skills.length === 0 ? (
          <Typography color="text.secondary">No skills added</Typography>
        ) : (
          skills.map((skill) => (
            <Chip
              key={skill}
              label={skill}
              variant="outlined"
            />
          ))
        )}
      </Box>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>Edit Skills</DialogTitle>
        <DialogContent>
          <Tabs
            value={activeCategory}
            onChange={(_, newValue) => setActiveCategory(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ mb: 2 }}
          >
            {skillCategories.map((category, index) => (
              <Tab key={category.id} label={category.name} value={index} />
            ))}
          </Tabs>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Selected Skills:</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {selectedSkills.map((skill) => (
                <Chip
                  key={skill}
                  label={skill}
                  onDelete={() => handleSkillDelete(skill)}
                />
              ))}
            </Box>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Available Skills:</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {skillCategories[activeCategory].skills.map((skill) => (
                <Chip
                  key={skill}
                  label={skill}
                  onClick={() => !selectedSkills.includes(skill) && setSelectedSkills([...selectedSkills, skill])}
                  variant={selectedSkills.includes(skill) ? 'filled' : 'outlined'}
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              label="Add Custom Skill"
              value={customSkill}
              onChange={(e) => setCustomSkill(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddCustomSkill()}
            />
            <Button
              variant="contained"
              onClick={handleAddCustomSkill}
              startIcon={<AddIcon />}
              disabled={!customSkill}
            >
              Add
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
