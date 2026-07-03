import React from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  Line,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';

interface LogoProps {
  size?: number;
  showPulse?: boolean;
}

const LINES = [
  { x1: 200, y1: 260, x2: 140, y2: 200 },
  { x1: 140, y1: 200, x2: 130, y2: 160 },
  { x1: 130, y1: 160, x2: 155, y2: 135 },
  { x1: 155, y1: 135, x2: 185, y2: 140 },
  { x1: 185, y1: 140, x2: 200, y2: 165 },
  { x1: 200, y1: 165, x2: 215, y2: 140 },
  { x1: 215, y1: 140, x2: 245, y2: 135 },
  { x1: 245, y1: 135, x2: 270, y2: 160 },
  { x1: 270, y1: 160, x2: 260, y2: 200 },
  { x1: 260, y1: 200, x2: 200, y2: 260 },
];

const STARS = [
  { cx: 200, cy: 260, r: 6, fill: 'white' },
  { cx: 140, cy: 200, r: 5, fill: '#3B82F6' },
  { cx: 130, cy: 160, r: 4, fill: '#10B981' },
  { cx: 155, cy: 135, r: 5, fill: '#F59E0B' },
  { cx: 185, cy: 140, r: 4, fill: '#8B5CF6' },
  { cx: 215, cy: 140, r: 4, fill: '#8B5CF6' },
  { cx: 245, cy: 135, r: 5, fill: '#F59E0B' },
  { cx: 270, cy: 160, r: 4, fill: '#10B981' },
  { cx: 260, cy: 200, r: 5, fill: '#3B82F6' },
];

export default function Logo({ size = 80, showPulse = false }: LogoProps) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg viewBox="0 0 400 400" width={size} height={size}>
        <Defs>
          <LinearGradient id="logoLine" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#3B82F6" stopOpacity={0.8} />
            <Stop offset="100%" stopColor="#10B981" stopOpacity={0.8} />
          </LinearGradient>
        </Defs>

        {showPulse && (
          <>
            <Circle cx={200} cy={165} r={25} fill="none" stroke="#EF4444" strokeWidth={0.8} opacity={0.15} />
            <Circle cx={200} cy={165} r={40} fill="none" stroke="#EF4444" strokeWidth={0.5} opacity={0.08} />
            <Circle cx={200} cy={165} r={14} fill="#EF4444" opacity={0.2} />
          </>
        )}

        {LINES.map((l, i) => (
          <Line
            key={i}
            x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke="url(#logoLine)" strokeWidth={2}
          />
        ))}

        {STARS.map((s, i) => (
          <Circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill={s.fill} />
        ))}

        <Circle cx={200} cy={165} r={7} fill="#EF4444" />
      </Svg>
    </View>
  );
}
