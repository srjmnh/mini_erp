import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Stack,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  useTheme,
  alpha,
  Tooltip,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import {
  Description as DocumentIcon,
  Upload as UploadIcon,
  Badge as BadgeIcon,
  DriveFileRenameOutline as LicenseIcon,
  FlightTakeoff as PassportIcon,
  AccountBox as IdCardIcon,
  Work as WorkPermitIcon,
  School as EducationIcon,
  LocalHospital as MedicalIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { format, isBefore, addDays } from 'date-fns';
import { useSupabase } from '@/contexts/SupabaseContext';

interface OfficialDocument {
  id: string;
  name: string;
  category: string;
  expiryDate: string;
  path: string;
  uploadedAt: string;
}

const documentCategories = [
  { id: 'passport', label: 'Passport', icon: PassportIcon },
  { id: 'id_card', label: 'ID Card', icon: IdCardIcon },
  { id: 'license', label: 'License', icon: LicenseIcon },
  { id: 'work_permit', label: 'Work Permit', icon: WorkPermitIcon },
  { id: 'education', label: 'Education Certificate', icon: EducationIcon },
  { id: 'medical', label: 'Medical Certificate', icon: MedicalIcon },
];

interface OfficialDocumentsProps {
  employeeId: string;
  showSnackbar: (message: string, severity: 'error' | 'success') => void;
}

const OfficialDocuments: React.FC<OfficialDocumentsProps> = ({ employeeId, showSnackbar }) => {
  const theme = useTheme();
  const { supabase } = useSupabase();
  const [documents, setDocuments] = useState<OfficialDocument[]>([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentCategory, setDocumentCategory] = useState('');
  const [expiryDate, setExpiryDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [employeeId]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('official_documents')
        .select('*')
        .eq('employee_id', employeeId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      showSnackbar('Failed to fetch documents', 'error');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !documentCategory || !expiryDate) {
      showSnackbar('Please fill in all required fields', 'error');
      return;
    }

    try {
      setUploading(true);

      // Upload file to storage
      const filePath = `employees/${employeeId}/official_documents/${documentCategory}/${selectedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Save document metadata
      const { error: dbError } = await supabase
        .from('official_documents')
        .insert({
          employee_id: employeeId,
          name: selectedFile.name,
          category: documentCategory,
          expiry_date: expiryDate.toISOString(),
          path: filePath,
          uploaded_at: new Date().toISOString(),
        });

      if (dbError) throw dbError;

      showSnackbar('Document uploaded successfully', 'success');
      setUploadDialogOpen(false);
      fetchDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      showSnackbar('Failed to upload document', 'error');
    } finally {
      setUploading(false);
      setSelectedFile(null);
      setDocumentCategory('');
      setExpiryDate(null);
    }
  };

  const handleDownload = async (document: OfficialDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(document.path);

      if (error) throw error;

      // Create download link
      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = document.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      showSnackbar('Failed to download document', 'error');
    }
  };

  const getDocumentIcon = (category: string) => {
    const docCategory = documentCategories.find(c => c.id === category);
    const Icon = docCategory?.icon || DocumentIcon;
    return <Icon />;
  };

  const isExpiringSoon = (date: string) => {
    const expiryDate = new Date(date);
    const thirtyDaysFromNow = addDays(new Date(), 30);
    return isBefore(expiryDate, thirtyDaysFromNow);
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Official Documents</Typography>
        <Button
          variant="contained"
          startIcon={<UploadIcon />}
          onClick={() => setUploadDialogOpen(true)}
        >
          Upload Document
        </Button>
      </Stack>

      <Grid container spacing={2}>
        {documents.map((document) => (
          <Grid item xs={12} sm={6} md={4} key={document.id}>
            <Card
              variant="outlined"
              sx={{
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.04),
                  transform: 'translateY(-2px)',
                  transition: 'all 0.2s',
                },
              }}
              onClick={() => handleDownload(document)}
            >
              <CardContent>
                <Stack spacing={2} alignItems="center">
                  <Box
                    sx={{
                      position: 'relative',
                      width: 64,
                      height: 64,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      borderRadius: 2,
                    }}
                  >
                    {getDocumentIcon(document.category)}
                    {isExpiringSoon(document.expiryDate) && (
                      <Tooltip title="Expiring soon">
                        <WarningIcon
                          sx={{
                            position: 'absolute',
                            top: -8,
                            right: -8,
                            color: theme.palette.warning.main,
                          }}
                        />
                      </Tooltip>
                    )}
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="subtitle1">
                      {documentCategories.find(c => c.id === document.category)?.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Expires: {format(new Date(document.expiryDate), 'MMM dd, yyyy')}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Upload Dialog */}
      <Dialog
        open={uploadDialogOpen}
        onClose={() => setUploadDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Upload Official Document</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              select
              label="Document Category"
              value={documentCategory}
              onChange={(e) => setDocumentCategory(e.target.value)}
              fullWidth
            >
              {documentCategories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <category.icon sx={{ fontSize: 20 }} />
                    <Typography>{category.label}</Typography>
                  </Stack>
                </MenuItem>
              ))}
            </TextField>

            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Expiry Date"
                value={expiryDate}
                onChange={(newValue) => setExpiryDate(newValue)}
                sx={{ width: '100%' }}
              />
            </LocalizationProvider>

            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadIcon />}
              fullWidth
            >
              {selectedFile ? selectedFile.name : 'Choose File'}
              <input
                type="file"
                hidden
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={!selectedFile || !documentCategory || !expiryDate || uploading}
          >
            Upload
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OfficialDocuments;
