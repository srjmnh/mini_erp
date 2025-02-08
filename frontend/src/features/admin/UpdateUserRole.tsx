import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { useSnackbar } from '@/contexts/SnackbarContext';

async function updateUserToAdmin(email: string) {
  try {
    // Find user by email
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error('User not found');
    }

    // Get the first matching user document
    const userDoc = querySnapshot.docs[0];
    
    // Update user role to HR0
    await updateDoc(doc(db, 'users', userDoc.id), {
      role: 'HR0',
      updatedAt: new Date()
    });

    return true;
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}

export default function UpdateUserRole() {
  const [loading, setLoading] = useState(false);
  const { showSnackbar } = useSnackbar();

  const handleUpdateRole = async () => {
    setLoading(true);
    try {
      await updateUserToAdmin('demo@demo.com');
      showSnackbar('Successfully updated user role to HR admin', 'success');
      // Reload the page to reflect changes
      window.location.reload();
    } catch (error) {
      showSnackbar('Error updating user role', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h6" gutterBottom>
        Update User Role
      </Typography>
      <Button
        variant="contained"
        color="primary"
        onClick={handleUpdateRole}
        disabled={loading}
      >
        {loading ? <CircularProgress size={24} /> : 'Make demo@demo.com HR Admin'}
      </Button>
    </Box>
  );
}
