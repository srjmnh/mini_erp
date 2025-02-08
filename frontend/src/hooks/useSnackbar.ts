import { useCallback } from 'react';
import { useSnackbar as useNotistack } from 'notistack';

type SnackbarSeverity = 'success' | 'error' | 'warning' | 'info';

export function useSnackbar() {
  const { enqueueSnackbar } = useNotistack();

  const showSnackbar = useCallback((message: string, severity: SnackbarSeverity) => {
    enqueueSnackbar(message, {
      variant: severity,
      anchorOrigin: { vertical: 'top', horizontal: 'right' },
      autoHideDuration: 3000,
    });
  }, [enqueueSnackbar]);

  return { showSnackbar };
}
