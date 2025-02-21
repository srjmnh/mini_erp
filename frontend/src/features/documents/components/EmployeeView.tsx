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
  Description as DocumentIcon,
  ArrowForward as ArrowForwardIcon,
  Work as WorkIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
} from '@mui/icons-material';
import { useSupabase } from '@/contexts/SupabaseContext';
import { useFirestore } from '@/contexts/FirestoreContext';

interface EmployeeCardProps {
  employee: any;
  onSelect: (empId: string) => void;
  documentCount: number;
}

const EmployeeCard: React.FC<EmployeeCardProps> = ({ employee, onSelect, documentCount }) => {
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
          {/* Employee Header */}
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              src={employee.photoURL}
              sx={{
                width: 64,
                height: 64,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
              }}
            >
              {employee.name?.charAt(0)}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" gutterBottom>
                {employee.name}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Chip
                  size="small"
                  icon={<WorkIcon sx={{ fontSize: 16 }} />}
                  label={employee.position}
                  sx={{
                    bgcolor: alpha(theme.palette.info.main, 0.1),
                    color: 'info.main',
                  }}
                />
              </Stack>
            </Box>
          </Stack>

          {/* Employee Details */}
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center">
              <EmailIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
              <Typography variant="body2" color="text.secondary">
                {employee.email}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <PhoneIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
              <Typography variant="body2" color="text.secondary">
                {employee.phone || 'Not provided'}
              </Typography>
            </Stack>
          </Stack>

          {/* Document Stats */}
          <Box sx={{ py: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                sx={{
                  bgcolor: alpha(theme.palette.success.main, 0.1),
                  color: 'success.main',
                }}
              >
                <DocumentIcon />
              </Avatar>
              <Box>
                <Typography variant="h6" color="success.main">
                  {documentCount}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Documents
                </Typography>
              </Box>
            </Stack>
          </Box>

          {/* Action Button */}
          <Button
            variant="contained"
            fullWidth
            endIcon={<ArrowForwardIcon />}
            onClick={() => onSelect(employee.id)}
            sx={{ mt: 'auto' }}
          >
            View Documents
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
};

interface EmployeeViewProps {
  onSelectEmployee: (empId: string) => void;
  showSnackbar: (message: string, severity: 'error' | 'success') => void;
}

export const EmployeeView: React.FC<EmployeeViewProps> = ({ onSelectEmployee, showSnackbar }) => {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [documentCounts, setDocumentCounts] = useState<Record<string, number>>({});
  const { supabase } = useSupabase();
  const { getEmployees } = useFirestore();

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        // Get employees using the Firestore context
        const emps = await getEmployees();
        
        // Transform employee data to match the HR page format
        const transformedEmps = emps.map(emp => ({
          id: emp.id,
          name: emp.name, // Name is already formatted in getEmployees
          position: emp.role || emp.position || 'Employee',
          email: emp.email || 'No email provided',
          phone: emp.phone || emp.phoneNumber || 'Not provided',
          photoURL: emp.photoURL || emp.avatar
        }));
        
        setEmployees(transformedEmps);

        // Fetch document counts for each employee
        const counts: Record<string, number> = {};
        await Promise.all(
          transformedEmps.map(async (emp) => {
            const { data } = await supabase.storage
              .from('documents')
              .list(`employees/${emp.id}`);
            counts[emp.id] = data?.length || 0;
          })
        );
        setDocumentCounts(counts);
      } catch (error) {
        console.error('Error fetching employees:', error);
        if (error instanceof Error) {
          showSnackbar(error.message, 'error');
        } else {
          showSnackbar('Failed to fetch employees', 'error');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [getEmployees, supabase, showSnackbar]);

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
      {employees.map((employee) => (
        <Grid item xs={12} md={4} key={employee.id}>
          <EmployeeCard
            employee={employee}
            onSelect={onSelectEmployee}
            documentCount={documentCounts[employee.id] || 0}
          />
        </Grid>
      ))}
    </Grid>
  );
};

export default EmployeeView;
