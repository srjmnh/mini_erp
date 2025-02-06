import React from 'react';
import { Group, Breadcrumbs, Anchor, Text } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';

interface BreadcrumbNavProps {
  items: {
    title: string;
    onClick?: () => void;
  }[];
}

export function BreadcrumbNav({ items }: BreadcrumbNavProps) {
  const breadcrumbItems = items.map((item, index) => {
    const isLast = index === items.length - 1;
    return isLast ? (
      <Text weight={500} key={item.title}>
        {item.title}
      </Text>
    ) : (
      <Anchor
        key={item.title}
        onClick={item.onClick}
        sx={(theme) => ({
          color: theme.colors.blue[6],
          '&:hover': {
            textDecoration: 'none',
            color: theme.colors.blue[7],
          },
        })}
      >
        {item.title}
      </Anchor>
    );
  });

  return (
    <Group spacing={8}>
      <Breadcrumbs separator={<IconChevronRight size={14} />}>
        {breadcrumbItems}
      </Breadcrumbs>
    </Group>
  );
}
