import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Avatar,
  Box,
  Chip,
} from '@mui/material';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  status: string;
  department?: string;
}

interface TeamMemberCardProps {
  member: TeamMember;
}

export const TeamMemberCard: React.FC<TeamMemberCardProps> = ({ member }) => {
  return (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar
            src={member.avatar}
            alt={member.name}
            sx={{ width: 56, height: 56 }}
          />
          <Box>
            <Typography variant="h6">{member.name}</Typography>
            <Typography color="textSecondary" variant="body2">
              {member.role}
            </Typography>
            {member.department && (
              <Typography color="textSecondary" variant="body2">
                {member.department}
              </Typography>
            )}
            <Box mt={1}>
              <Chip
                label={member.status}
                size="small"
                color={member.status === 'active' ? 'success' : 'default'}
              />
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default TeamMemberCard;
