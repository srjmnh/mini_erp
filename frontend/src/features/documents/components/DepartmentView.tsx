import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Stack,
  Avatar,
  Chip,
  IconButton,
  Button,
  alpha,
  Skeleton,
  useTheme,
} from '@mui/material';
import {
  Folder as FolderIcon,
  People as PeopleIcon,
  Person as PersonIcon,
  Description as DocumentIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { useSupabase } from '@/contexts/SupabaseContext';
import { useFirestore } from '@/contexts/FirestoreContext';

interface DepartmentCardProps {
  department: any;
  onSelect: (deptId: string) => void;
  documentCount: number;
}

const DepartmentCard: React.FC<DepartmentCardProps> = ({ department, onSelect, documentCount }) => {
  const theme = useTheme();

  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[4],
        },
      }}
    >
      <CardContent>
        <Stack spacing={2}>
          {/* Department Header */}
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              sx={{
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
                width: 56,
                height: 56,
              }}
            >
              <FolderIcon sx={{ fontSize: 32 }} />
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" gutterBottom>
                {department.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {department.description || 'No description available'}
              </Typography>
            </Box>
          </Stack>

          {/* Department Stats */}
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Stack alignItems="center" spacing={1}>
                <Avatar
                  sx={{
                    bgcolor: alpha(theme.palette.info.main, 0.1),
                    color: 'info.main',
                  }}
                >
                  <DocumentIcon />
                </Avatar>
                <Typography variant="h6">{documentCount}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Documents
                </Typography>
              </Stack>
            </Grid>
            <Grid item xs={4}>
              <Stack alignItems="center" spacing={1}>
                <Avatar
                  sx={{
                    bgcolor: alpha(theme.palette.success.main, 0.1),
                    color: 'success.main',
                  }}
                >
                  <PersonIcon />
                </Avatar>
                <Typography variant="h6">{department.head?.name || '-'}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Head
                </Typography>
              </Stack>
            </Grid>
            <Grid item xs={4}>
              <Stack alignItems="center" spacing={1}>
                <Avatar
                  sx={{
                    bgcolor: alpha(theme.palette.warning.main, 0.1),
                    color: 'warning.main',
                  }}
                >
                  <PeopleIcon />
                </Avatar>
                <Typography variant="h6">{department.memberCount || 0}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Members
                </Typography>
              </Stack>
            </Grid>
          </Grid>

          {/* Action Button */}
          <Button
            variant="contained"
            fullWidth
            endIcon={<ArrowForwardIcon />}
            onClick={() => onSelect(department.id)}
            sx={{ mt: 2 }}
          >
            View Documents
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
};

interface DepartmentViewProps {
  onSelectDepartment: (deptId: string) => void;
}

export const DepartmentView: React.FC<DepartmentViewProps> = ({ onSelectDepartment }) => {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [documentCounts, setDocumentCounts] = useState<Record<string, number>>({});
  const { supabase } = useSupabase();
  const { getDepartments } = useFirestore();

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        setLoading(true);
        const deps = await getDepartments();
        setDepartments(deps);

        // Fetch document counts for each department
        const counts: Record<string, number> = {};
        await Promise.all(
          deps.map(async (dept) => {
            const { data } = await supabase.storage
              .from('documents')
              .list(`departments/${dept.id}`);
            counts[dept.id] = data?.length || 0;
          })
        );
        setDocumentCounts(counts);
      } catch (error) {
        console.error('Error fetching departments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDepartments();
  }, [getDepartments, supabase]);

  if (loading) {
    return (
      <Grid container spacing={3}>
        {[1, 2, 3].map((i) => (
          <Grid item xs={12} md={4} key={i}>
            <Skeleton variant="rectangular" height={300} />
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <Grid container spacing={3}>
      {departments.map((department) => (
        <Grid item xs={12} md={4} key={department.id}>
          <DepartmentCard
            department={department}
            onSelect={onSelectDepartment}
            documentCount={documentCounts[department.id] || 0}
          />
        </Grid>
      ))}
    </Grid>
  );
};

export default DepartmentView;
