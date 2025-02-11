import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { TaskList } from './TaskList';
import { Task } from '@/types/task';

interface TaskSectionProps {
  tasks: Task[];
  onAddTask: () => void;
  onUpdateTask: (taskId: string, progress: number, comment: string, completed: boolean) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
}

const TaskSection: React.FC<TaskSectionProps> = ({
  tasks,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onEditTask,
}) => {
  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Your Tasks</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={onAddTask}
          size="small"
        >
          Add Task
        </Button>
      </Box>
      <Box 
        sx={{ 
          maxHeight: 'calc(100vh - 400px)',
          overflowY: 'auto',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#bdbdbd',
            borderRadius: '4px',
            '&:hover': {
              background: '#9e9e9e'
            }
          }
        }}
      >
        <TaskList
          tasks={tasks}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
          onEditTask={onEditTask}
        />
      </Box>
    </Box>
  );
};

export { TaskSection };
