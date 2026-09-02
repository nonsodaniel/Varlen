import React from 'react';
import Svg, { Circle, Line, Path, Defs, LinearGradient, RadialGradient, Stop, ClipPath, Rect, G } from 'react-native-svg';

interface SivenaLogoProps {
  size?: number;
}

/**
 * Official Sivena logo — house constellation (logo-4e).
 * Renders the exact logo design with dark background, star field,
 * house constellation, corner nodes, heart, and roof peak star.
 */
export default function SivenaLogo({ size = 80 }: SivenaLogoProps) {
  return (
    <Svg viewBox="0 0 400 400" width={size} height={size}>
      <Defs>
        <RadialGradient id="slBg" cx="50%" cy="45%" r="55%">
          <Stop offset="0%" stopColor="#0F1830" />
          <Stop offset="100%" stopColor="#04060F" />
        </RadialGradient>
        <LinearGradient id="slLg" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#34D399" stopOpacity={0.9} />
          <Stop offset="100%" stopColor="#3B82F6" stopOpacity={0.9} />
        </LinearGradient>
        <LinearGradient id="slRg" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#60A5FA" stopOpacity={0.95} />
          <Stop offset="100%" stopColor="#34D399" stopOpacity={0.95} />
        </LinearGradient>
        <ClipPath id="slFr">
          <Rect width={400} height={400} rx={84} />
        </ClipPath>
      </Defs>
      <G clipPath="url(#slFr)">
        {/* Background */}
        <Rect width={400} height={400} fill="url(#slBg)" />

        {/* Star field */}
        <Circle cx={80}  cy={72}  r={1.5} fill="white"   opacity={0.45} />
        <Circle cx={312} cy={58}  r={1}   fill="#60A5FA" opacity={0.5}  />
        <Circle cx={65}  cy={295} r={1}   fill="white"   opacity={0.3}  />
        <Circle cx={338} cy={318} r={1.5} fill="#34D399" opacity={0.45} />
        <Circle cx={158} cy={38}  r={1}   fill="white"   opacity={0.35} />
        <Circle cx={344} cy={195} r={1}   fill="white"   opacity={0.4}  />
        <Circle cx={95}  cy={355} r={1}   fill="#F472B6" opacity={0.35} />
        <Circle cx={280} cy={365} r={1}   fill="white"   opacity={0.3}  />
        <Circle cx={50}  cy={210} r={1}   fill="#60A5FA" opacity={0.35} />

        {/* House constellation — roof slopes */}
        <Line x1={200} y1={88}  x2={103} y2={200} stroke="url(#slRg)" strokeWidth={3} strokeLinecap="round" opacity={0.9}  />
        <Line x1={200} y1={88}  x2={297} y2={200} stroke="url(#slRg)" strokeWidth={3} strokeLinecap="round" opacity={0.9}  />
        {/* Eave */}
        <Line x1={103} y1={200} x2={297} y2={200} stroke="url(#slLg)" strokeWidth={2} strokeLinecap="round" opacity={0.65} />
        {/* Walls */}
        <Line x1={103} y1={200} x2={103} y2={313} stroke="url(#slLg)" strokeWidth={2} strokeLinecap="round" opacity={0.65} />
        <Line x1={297} y1={200} x2={297} y2={313} stroke="url(#slLg)" strokeWidth={2} strokeLinecap="round" opacity={0.65} />
        {/* Base */}
        <Line x1={103} y1={313} x2={297} y2={313} stroke="url(#slLg)" strokeWidth={2} strokeLinecap="round" opacity={0.65} />
        {/* Door */}
        <Line x1={176} y1={313} x2={176} y2={262} stroke="url(#slLg)" strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
        <Line x1={224} y1={313} x2={224} y2={262} stroke="url(#slLg)" strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
        <Line x1={176} y1={262} x2={224} y2={262} stroke="url(#slLg)" strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />

        {/* Corner nodes — life mode colors */}
        <Circle cx={103} cy={200} r={9}   fill="#3B82F6" />
        <Circle cx={297} cy={200} r={9}   fill="#EC4899" />
        <Circle cx={103} cy={313} r={8.5} fill="#10B981" />
        <Circle cx={297} cy={313} r={8.5} fill="#F59E0B" />

        {/* Heart */}
        <Path
          d="M200,232 C200,232 180,217 180,204 C180,196 190,189 200,199 C210,189 220,196 220,204 C220,217 200,232 200,232 Z"
          fill="#F472B6"
          opacity={0.9}
        />

        {/* Roof peak star */}
        <Circle cx={200} cy={88} r={16} fill="#60A5FA" />
        <Circle cx={200} cy={88} r={9}  fill="white"   />
      </G>
    </Svg>
  );
}
