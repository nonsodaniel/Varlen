import React from 'react';
import { View } from 'react-native';
import Svg, {
  Circle,
  Line,
  Path,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';

interface LogoProps {
  size?: number;
}

const ROOF_LINES = [
  { x1: 200, y1: 88, x2: 103, y2: 200 },
  { x1: 200, y1: 88, x2: 297, y2: 200 },
];

const NODES = [
  { cx: 103, cy: 200, r: 9,   fill: '#3B82F6' }, // personal
  { cx: 297, cy: 200, r: 9,   fill: '#EC4899' }, // couple
  { cx: 103, cy: 313, r: 8.5, fill: '#10B981' }, // family
  { cx: 297, cy: 313, r: 8.5, fill: '#F59E0B' }, // parenting
];

export default function Logo({ size = 80 }: LogoProps) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg viewBox="82 65 236 258" width={size} height={size}>
        <Defs>
          <LinearGradient id="logoRoof" x1="82" y1="65" x2="318" y2="323" gradientUnits="userSpaceOnUse">
            <Stop offset="0%" stopColor="#60A5FA" stopOpacity={0.95} />
            <Stop offset="100%" stopColor="#34D399" stopOpacity={0.95} />
          </LinearGradient>
        </Defs>

        {ROOF_LINES.map((l, i) => (
          <Line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke="url(#logoRoof)" strokeWidth={3} strokeLinecap="round" />
        ))}

        {NODES.map((n, i) => (
          <Circle key={i} cx={n.cx} cy={n.cy} r={n.r} fill={n.fill} />
        ))}

        <Path
          d="M200,232 C200,232 180,217 180,204 C180,196 190,189 200,199 C210,189 220,196 220,204 C220,217 200,232 200,232 Z"
          fill="#F472B6"
        />

        <Circle cx={200} cy={88} r={16} fill="#60A5FA" />
        <Circle cx={200} cy={88} r={9} fill="white" />
      </Svg>
    </View>
  );
}
