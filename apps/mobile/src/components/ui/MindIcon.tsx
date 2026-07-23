import React from 'react';
import Svg, { Path, Line, Polyline } from 'react-native-svg';

interface MindIconProps {
  size?: number;
  color?: string;
}

export function MindIcon({ size = 24, color = '#8B5CF6' }: MindIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Path
        d="M28 78 L28 56 Q22 47, 22 37 Q22 14, 50 14 Q78 14, 78 37 Q78 47, 72 56 L72 78"
        stroke={color}
        strokeWidth={6.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line
        x1="32" y1="78" x2="68" y2="78"
        stroke={color}
        strokeWidth={6.5}
        strokeLinecap="round"
      />
      <Polyline
        points="32,50 39,50 43,36 48,64 53,40 58,50 68,50"
        stroke={color}
        strokeWidth={5.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
