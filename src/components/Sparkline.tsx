import React from 'react';
import Svg, { Polyline } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

interface Props {
  data: number[];
  width: number;
  height: number;
}

// A bare trend line for list rows — no axes, no labels, no legend, per the
// single-series "de-emphasized sparkline" case: color is the only signal,
// carried alongside the numeric % change already shown next to it.
export default function Sparkline({ data, width, height }: Props) {
  const { colors } = useTheme();

  if (data.length < 2) {
    return <Svg width={width} height={height} />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const isUp = data[data.length - 1] >= data[0];
  const color = isUp ? colors.success : colors.danger;

  const points = data
    .map((value, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <Svg width={width} height={height}>
      <Polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}
