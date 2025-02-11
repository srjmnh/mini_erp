import React from 'react';
import { Grid } from '@mui/material';
import TaskCard from '@/components/tasks/TaskCard';
import { Task } from '@/types/task';

interface TaskListProps {
  tasks: Task[];
  onUpdateTask: (taskId: string, progress: number, comment: string, completed: boolean) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
}

const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onUpdateTask,
  onDeleteTask,
  onEditTask,
}) => {
  return (
    <Grid container spacing={2}>
      {tasks.map((task) => (
        <Grid item xs={12} sm={6} md={4} key={task.id}>
          <TaskCard
            task={task}
            onUpdate={onUpdateTask}
            onDelete={onDeleteTask}
            onEdit={onEditTask}
          />
        </Grid>
      ))}
    </Grid>
  );
};

export { TaskList };
