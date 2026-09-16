import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, View } from 'react-native';
import Svg, { Circle, Line as SvgLine, Path } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { PricePoint } from '../lib/priceService';

interface Props {
  data: PricePoint[];
  width: number;
  height: number;
  onScrub?: (point: PricePoint | null) => void;
}

export default function PriceChart({ data, width, height, onScrub }: Props) {
  const { colors } = useTheme();
  const [touchX, setTouchX] = useState<number | null>(null);

  const { min, max, isUp, points, path, areaPath } = useMemo(() => {
    if (data.length < 2) {
      return { min: 0, max: 0, isUp: true, points: [] as { x: number; y: number }[], path: '', areaPath: '' };
    }
    const prices = data.map((p) => p.price);
    const minVal = Math.min(...prices);
    const maxVal = Math.max(...prices);
    const range = maxVal - minVal || 1;
    const pts = data.map((p, i) => ({
      x: (i / (data.length - 1)) * width,
      y: height - ((p.price - minVal) / range) * height,
    }));
    const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
    const area = `${linePath} L${width},${height} L0,${height} Z`;
    return {
      min: minVal,
      max: maxVal,
      isUp: data[data.length - 1].price >= data[0].price,
      points: pts,
      path: linePath,
      areaPath: area,
    };
  }, [data, width, height]);

  const color = isUp ? colors.success : colors.danger;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => handleScrub(evt.nativeEvent.locationX),
      onPanResponderMove: (evt) => handleScrub(evt.nativeEvent.locationX),
      onPanResponderRelease: () => {
        setTouchX(null);
        onScrub?.(null);
      },
      onPanResponderTerminate: () => {
        setTouchX(null);
        onScrub?.(null);
      },
    })
  ).current;

  function handleScrub(x: number) {
    if (points.length === 0) return;
    const clampedX = Math.max(0, Math.min(width, x));
    let nearestIndex = 0;
    let nearestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - clampedX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIndex = i;
      }
    });
    setTouchX(points[nearestIndex].x);
    onScrub?.(data[nearestIndex]);
  }

  if (data.length < 2) {
    return <View style={{ width, height }} />;
  }

  const activePoint = touchX !== null ? points[points.findIndex((p) => p.x === touchX)] : null;

  return (
    <View {...panResponder.panHandlers}>
      <Svg width={width} height={height}>
        <Path d={areaPath} fill={color} fillOpacity={0.1} />
        <Path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {activePoint && (
          <>
            <SvgLine
              x1={activePoint.x}
              y1={0}
              x2={activePoint.x}
              y2={height}
              stroke={colors.textMuted}
              strokeWidth={1}
            />
            <Circle cx={activePoint.x} cy={activePoint.y} r={6} fill={color} stroke={colors.background} strokeWidth={2} />
          </>
        )}
      </Svg>
    </View>
  );
}
