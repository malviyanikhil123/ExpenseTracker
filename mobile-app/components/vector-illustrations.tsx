import React from 'react';
import Svg, {
  Path,
  Circle,
  Rect,
  Defs,
  LinearGradient,
  Stop,
  G,
} from 'react-native-svg';
import { palette } from '@/constants/app-theme';

export function LoginIllustration({ size = 160 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Defs>
        <LinearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={palette.primary} stopOpacity={0.05} />
          <Stop offset="100%" stopColor={palette.secondary} stopOpacity={0.15} />
        </LinearGradient>
        <LinearGradient id="cardGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={palette.primary} />
          <Stop offset="100%" stopColor={palette.secondary} />
        </LinearGradient>
        <LinearGradient id="graphGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={palette.primary} stopOpacity={0.4} />
          <Stop offset="100%" stopColor={palette.primary} stopOpacity={0.0} />
        </LinearGradient>
      </Defs>

      {/* Decorative Background Glow Ring */}
      <Circle cx="100" cy="100" r="80" fill="url(#bgGrad)" />
      <Circle cx="100" cy="100" r="79" stroke={palette.border} strokeWidth="1" strokeDasharray="4 4" />

      {/* Stylized Bar Chart Bars in background */}
      <Rect x="45" y="110" width="12" height="40" rx="4" fill={palette.surfaceAlt} />
      <Rect x="65" y="90" width="12" height="60" rx="4" fill={palette.surfaceAlt} />
      <Rect x="85" y="105" width="12" height="45" rx="4" fill={palette.surfaceAlt} />

      {/* Floating Dashboard Card */}
      <G transform="translate(60, 65)">
        {/* Main Card Surface */}
        <Rect width="100" height="64" rx="12" fill={palette.surface} stroke={palette.border} strokeWidth="1.5" />
        
        {/* Card Header Line */}
        <Rect x="12" y="12" width="30" height="6" rx="3" fill={palette.muted} />
        
        {/* Card Main Value Indicator */}
        <Rect x="12" y="24" width="55" height="10" rx="4" fill="url(#cardGrad)" />
        
        {/* Decorative Chip/Sim Icon */}
        <Rect x="76" y="12" width="12" height="10" rx="2" fill={palette.secondary} opacity={0.8} />

        {/* Small Details */}
        <Circle cx="15" cy="48" r="3" fill={palette.muted} />
        <Circle cx="25" cy="48" r="3" fill={palette.muted} />
        <Circle cx="35" cy="48" r="3" fill={palette.muted} />
        <Circle cx="45" cy="48" r="3" fill={palette.muted} />
      </G>

      {/* Graph line overlay */}
      <Path
        d="M 30,150 Q 65,115 100,125 T 170,75"
        fill="none"
        stroke={palette.primary}
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <Path
        d="M 30,150 Q 65,115 100,125 T 170,75 L 170,150 L 30,150 Z"
        fill="url(#graphGrad)"
      />

      {/* Glowing Graph Nodes */}
      <Circle cx="100" cy="125" r="5" fill={palette.secondary} stroke={palette.background} strokeWidth="1.5" />
      <Circle cx="170" cy="75" r="5" fill={palette.primary} stroke={palette.background} strokeWidth="1.5" />

      {/* Floating Coins */}
      {/* Coin 1 */}
      <G transform="translate(35, 50)">
        <Circle cx="8" cy="8" r="10" fill={palette.secondary} stroke={palette.background} strokeWidth="1.5" />
        <Path d="M8,4 L8,12 M5,7 L11,7" stroke={palette.background} strokeWidth="1.5" strokeLinecap="round" />
      </G>

      {/* Coin 2 */}
      <G transform="translate(155, 125)">
        <Circle cx="8" cy="8" r="12" fill={palette.primary} stroke={palette.background} strokeWidth="1.5" />
        <Path d="M8,4 L8,12 M5,7 L11,7" stroke={palette.background} strokeWidth="1.5" strokeLinecap="round" />
      </G>
    </Svg>
  );
}

export function RegisterIllustration({ size = 160 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" fill="none">
      <Defs>
        <LinearGradient id="bgGradReg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={palette.secondary} stopOpacity={0.05} />
          <Stop offset="100%" stopColor={palette.primary} stopOpacity={0.15} />
        </LinearGradient>
        <LinearGradient id="walletGrad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor={palette.secondary} />
          <Stop offset="100%" stopColor={palette.primary} />
        </LinearGradient>
        <LinearGradient id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor={palette.primary} stopOpacity={0.8} />
          <Stop offset="100%" stopColor={palette.secondary} stopOpacity={0.8} />
        </LinearGradient>
      </Defs>

      {/* Background Circle */}
      <Circle cx="100" cy="100" r="80" fill="url(#bgGradReg)" />
      <Circle cx="100" cy="100" r="79" stroke={palette.border} strokeWidth="1" strokeDasharray="4 4" />

      {/* Floating Card Backdrop */}
      <G transform="translate(45, 65) rotate(-10)">
        <Rect width="95" height="58" rx="10" fill={palette.surfaceAlt} stroke={palette.border} strokeWidth="1" />
        <Rect x="10" y="38" width="40" height="6" rx="3" fill={palette.muted} opacity={0.6} />
        <Circle cx="80" cy="41" r="6" fill={palette.primary} opacity={0.3} />
      </G>

      {/* Main Stylized Wallet Card */}
      <G transform="translate(60, 75)">
        <Rect width="100" height="60" rx="12" fill={palette.surface} stroke={palette.border} strokeWidth="1.5" />
        
        {/* Card Magnetic Strip / Accent Line */}
        <Path d="M 0,16 L 100,16" stroke={palette.border} strokeWidth="2" />
        
        {/* Wallet Flap */}
        <Path
          d="M 70,24 L 96,24 C 98.2,24 100,25.8 100,28 L 100,44 C 100,46.2 98.2,48 96,48 L 70,48 Z"
          fill="url(#walletGrad)"
          stroke={palette.border}
          strokeWidth="1"
        />
        
        {/* Wallet Flap Button */}
        <Circle cx="82" cy="36" r="3.5" fill={palette.background} />
      </G>

      {/* Security Checkmark Shield representing safe onboarding */}
      <G transform="translate(25, 105)">
        {/* Shield outline */}
        <Path
          d="M 18,2 L 2,8 C 2,18 7,27 18,32 C 29,27 34,18 34,8 Z"
          fill="url(#shieldGrad)"
          stroke={palette.background}
          strokeWidth="2"
        />
        {/* Checkmark inside shield */}
        <Path
          d="M 10,17 L 15,22 L 25,12"
          fill="none"
          stroke={palette.background}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </G>

      {/* Sparkles / Stars */}
      {/* Star 1 */}
      <Path
        d="M 150,45 L 153,52 L 160,55 L 153,58 L 150,65 L 147,58 L 140,55 L 147,52 Z"
        fill={palette.secondary}
      />
      {/* Star 2 */}
      <Path
        d="M 120,30 L 121.5,33.5 L 125,35 L 121.5,36.5 L 120,40 L 118.5,36.5 L 115,35 L 118.5,33.5 Z"
        fill={palette.primary}
      />
      {/* Star 3 */}
      <Path
        d="M 165,100 L 166.5,103.5 L 170,105 L 166.5,106.5 L 165,110 L 163.5,106.5 L 160,105 L 163.5,103.5 Z"
        fill={palette.secondary}
      />
    </Svg>
  );
}
