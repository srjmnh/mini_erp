import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Avatar,
  AvatarGroup,
} from '@mui/material';
import { formatProjectDate } from '@/utils/dateUtils';

interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  progress: number;
  status: string;
  dueDate: Date;
  team: TeamMember[];
}

interface ProjectCardProps {
  project: Project;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'primary';
      case 'delayed':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="h6" gutterBottom>
              {project.title}
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              {project.description}
            </Typography>
          </Box>
          <Chip
            label={project.status}
            color={getStatusColor(project.status)}
            size="small"
          />
        </Box>

        <Box mt={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2" color="textSecondary">
              Progress
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {project.progress}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={project.progress}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="caption" color="textSecondary">
              Due Date
            </Typography>
            <Typography variant="body2">
              {formatProjectDate(project.dueDate)}
            </Typography>
          </Box>
          <AvatarGroup max={3}>
            {project.team.map((member) => (
              <Avatar
                key={member.id}
                alt={member.name}
                src={member.avatar}
                sx={{ width: 32, height: 32 }}
              />
            ))}
          </AvatarGroup>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ProjectCard;
