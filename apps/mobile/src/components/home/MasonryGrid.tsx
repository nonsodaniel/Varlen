import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { AnimatedCardEntrance } from '../AnimatedCardEntrance';
import { spacing } from '../../constants/theme';

export interface MasonryItem {
  id: string;
  component: React.ReactNode;
  heightEstimate: number;
}

interface MasonryGridProps {
  items: MasonryItem[];
  gap?: number;
  columnCount?: number;
}

export function MasonryGrid({
  items,
  gap = spacing.md,
  columnCount = 2,
}: MasonryGridProps) {
  const columns = useMemo(() => {
    const cols: MasonryItem[][] = Array.from({ length: columnCount }, () => []);
    const heights = new Array(columnCount).fill(0);

    for (const item of items) {
      // Find the shortest column
      const minIndex = heights.indexOf(Math.min(...heights));
      cols[minIndex].push(item);
      heights[minIndex] += item.heightEstimate + gap;
    }

    return cols;
  }, [items, gap, columnCount]);

  if (items.length === 0) return null;

  return (
    <View style={[styles.container, { gap }]}>
      {columns.map((column, colIdx) => (
        <View key={`col-${colIdx}`} style={[styles.column, { gap }]}>
          {column.map((item, itemIdx) => (
            <AnimatedCardEntrance
              key={item.id}
              index={colIdx * column.length + itemIdx}
            >
              {item.component}
            </AnimatedCardEntrance>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
  },
  column: {
    flex: 1,
  },
});
