import React from 'react';
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
  Chip,
  Rating,
  Stack,
  Divider,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import {
  WorkHistory as WorkHistoryIcon,
  School as EducationIcon,
  Code as SkillsIcon,
  Psychology as SoftSkillsIcon,
  TrendingUp as MatchIcon,
} from '@mui/icons-material';

interface CVAnalysisProps {
  analysis: {
    skills: {
      technical: string[];
      soft: string[];
      relevanceScore: number;
    };
    experience: {
      years: number;
      relevantYears: number;
      companies: string[];
      roles: string[];
    };
    education: {
      degree: string;
      field: string;
      institutions: string[];
      graduationYear: number;
    };
    jobMatch: {
      overallScore: number;
      skillsMatch: number;
      experienceMatch: number;
      educationMatch: number;
    };
  } | null;
  loading: boolean;
}

const CVAnalysis: React.FC<CVAnalysisProps> = ({ analysis, loading }) => {
  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Analyzing CV...</Typography>
      </Box>
    );
  }

  if (!analysis) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="text.secondary">No analysis available</Typography>
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 3 }}>
      {/* Overall Match Score */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          Overall Job Match
        </Typography>
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
          <CircularProgress
            variant="determinate"
            value={analysis.jobMatch.overallScore}
            size={80}
            thickness={4}
            sx={{
              color: (theme) =>
                analysis.jobMatch.overallScore > 70
                  ? theme.palette.success.main
                  : analysis.jobMatch.overallScore > 40
                  ? theme.palette.warning.main
                  : theme.palette.error.main,
            }}
          />
          <Box
            sx={{
              top: 0,
              left: 0,
              bottom: 0,
              right: 0,
              position: 'absolute',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography variant="h6" component="div">
              {`${Math.round(analysis.jobMatch.overallScore)}%`}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Skills Analysis */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SkillsIcon /> Technical Skills
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {analysis.skills.technical.map((skill) => (
            <Chip key={skill} label={skill} />
          ))}
        </Box>

        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
          <SoftSkillsIcon /> Soft Skills
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {analysis.skills.soft.map((skill) => (
            <Chip key={skill} label={skill} variant="outlined" />
          ))}
        </Box>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Experience Analysis */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WorkHistoryIcon /> Experience
        </Typography>
        <Stack spacing={1}>
          <Typography>
            Total Experience: {analysis.experience.years} years
          </Typography>
          <Typography>
            Relevant Experience: {analysis.experience.relevantYears} years
          </Typography>
          <Typography variant="subtitle2" color="text.secondary">
            Previous Roles:
          </Typography>
          {analysis.experience.roles.map((role, index) => (
            <Typography key={index} variant="body2">
              • {role}
            </Typography>
          ))}
        </Stack>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Education Analysis */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EducationIcon /> Education
        </Typography>
        <Stack spacing={1}>
          <Typography>
            {analysis.education.degree} in {analysis.education.field}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {analysis.education.institutions.join(', ')}
          </Typography>
          <Typography variant="body2">
            Graduated: {analysis.education.graduationYear}
          </Typography>
        </Stack>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Match Details */}
      <Box>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MatchIcon /> Match Details
        </Typography>
        <Stack spacing={2}>
          <Box>
            <Typography variant="body2" gutterBottom>
              Skills Match
            </Typography>
            <LinearProgress
              variant="determinate"
              value={analysis.jobMatch.skillsMatch}
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
              {Math.round(analysis.jobMatch.skillsMatch)}%
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" gutterBottom>
              Experience Match
            </Typography>
            <LinearProgress
              variant="determinate"
              value={analysis.jobMatch.experienceMatch}
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
              {Math.round(analysis.jobMatch.experienceMatch)}%
            </Typography>
          </Box>
          <Box>
            <Typography variant="body2" gutterBottom>
              Education Match
            </Typography>
            <LinearProgress
              variant="determinate"
              value={analysis.jobMatch.educationMatch}
              sx={{ height: 8, borderRadius: 4 }}
            />
            <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
              {Math.round(analysis.jobMatch.educationMatch)}%
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Paper>
  );
};

export default CVAnalysis;
