import React from 'react';
import { Stack, Text, Button, Paper, Center } from '@mantine/core';
import { IconFile } from '@tabler/icons-react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <Paper
      p="xl"
      sx={(theme) => ({
        backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[6] : theme.white,
        textAlign: 'center',
      })}
    >
      <Stack align="center" spacing="md">
        <Center
          sx={(theme) => ({
            width: 60,
            height: 60,
            borderRadius: theme.radius.md,
            backgroundColor: theme.fn.rgba(theme.colors.blue[6], 0.1),
            color: theme.colors.blue[6],
          })}
        >
          <IconFile size={30} />
        </Center>
        <Text size="lg" weight={500}>
          {title}
        </Text>
        <Text size="sm" color="dimmed" maw={400} mx="auto">
          {description}
        </Text>
        {actionLabel && onAction && (
          <Button variant="light" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
