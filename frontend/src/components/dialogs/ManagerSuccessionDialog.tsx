import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  FormControl,
  RadioGroup,
  FormControlLabel,
  Radio,
  Box,
  TextField,
  Alert,
} from '@mui/material';
import { Employee } from '@/types/employee';

interface ManagerSuccessionDialogProps {
  open: boolean;
  onClose: () => void;
  currentManager: Employee;
  deputyManager?: Employee;
  teamMembers: Employee[];
  onConfirm: (decision: 'deputy' | 'replacement', replacementId?: string) => Promise<void>;
  embedded?: boolean;
}

export const ManagerSuccessionDialog: React.FC<ManagerSuccessionDialogProps> = ({
  open,
  onClose,
  currentManager,
  deputyManager,
  teamMembers,
  onConfirm,
  embedded = false,
}) => {
  const [decision, setDecision] = useState<'deputy' | 'replacement'>(
    deputyManager ? 'deputy' : 'replacement'
  );
  const [selectedReplacement, setSelectedReplacement] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleConfirm = async () => {
    try {
      setLoading(true);
      setError('');
      await onConfirm(decision, decision === 'replacement' ? selectedReplacement : undefined);
      if (!embedded) {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update manager');
    } finally {
      setLoading(false);
    }
  };

  const eligibleTeamMembers = teamMembers.filter(
    (member) => member.id !== currentManager.id && member.id !== deputyManager?.id
  );

  const content = (
    <>
      {!embedded && <DialogTitle>Manager Succession Required</DialogTitle>}
      <DialogContent>
        {!embedded && (
          <Typography variant="body1" gutterBottom>
            {currentManager.name} is being removed from their position as manager.
            Please select how you would like to handle the succession:
          </Typography>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
            {error}
          </Alert>
        )}

        <FormControl component="fieldset" sx={{ mt: 2 }}>
          <RadioGroup
            value={decision}
            onChange={(e) => setDecision(e.target.value as 'deputy' | 'replacement')}
          >
            {deputyManager && (
              <FormControlLabel
                value="deputy"
                control={<Radio />}
                label={
                  <Typography>
                    Promote deputy manager {deputyManager.name} to manager
                  </Typography>
                }
              />
            )}
            <FormControlLabel
              value="replacement"
              control={<Radio />}
              label="Select a replacement from the team"
            />
          </RadioGroup>
        </FormControl>

        {decision === 'replacement' && (
          <Box sx={{ mt: 2 }}>
            <TextField
              select
              fullWidth
              label="Select Replacement Manager"
              value={selectedReplacement}
              onChange={(e) => setSelectedReplacement(e.target.value)}
              SelectProps={{
                native: true,
              }}
            >
              <option value="">Select a team member</option>
              {eligibleTeamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name} - {member.position}
                </option>
              ))}
            </TextField>
          </Box>
        )}
      </DialogContent>
      {!embedded && (
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            disabled={loading || (decision === 'replacement' && !selectedReplacement)}
          >
            Confirm
          </Button>
        </DialogActions>
      )}
    </>
  );

  return embedded ? (
    <Box>{content}</Box>
  ) : (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      {content}
    </Dialog>
  );
};
