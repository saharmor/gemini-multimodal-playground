'use client';

import React, { useRef, useEffect } from 'react';

interface AudioVisualizerProps {
  audioData: Uint8Array | null;
  height?: number;
  width?: number;
  barWidth?: number;
  gap?: number;
  barColor?: string;
  backgroundColor?: string;
  className?: string;
  isActive?: boolean;
}

/**
 * AudioVisualizer component that renders a frequency-based visualization of audio data
 */
export function AudioVisualizer({
  audioData,
  height = 50,
  width = 300,
  barWidth = 4,
  gap = 1,
  barColor = '#3b82f6', // blue-500
  backgroundColor = 'transparent',
  className = '',
  isActive = true,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw the visualization on canvas
  useEffect(() => {
    if (!canvasRef.current || !isActive) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    // Clear canvas
    context.clearRect(0, 0, width, height);
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, width, height);

    // If no audio data, draw a flat line
    if (!audioData) {
      context.fillStyle = barColor;
      context.fillRect(0, height / 2, width, 1);
      return;
    }

    // Calculate how many bars we can fit
    const totalBarsWithGap = width / (barWidth + gap);
    const numBars = Math.min(audioData.length, Math.floor(totalBarsWithGap));
    
    // Sample step to use data efficiently
    const step = Math.ceil(audioData.length / numBars);

    // Draw bars
    context.fillStyle = barColor;
    
    for (let i = 0; i < numBars; i++) {
      const dataIndex = i * step;
      if (dataIndex >= audioData.length) break;
      
      // Get value from audio data (0-255)
      const value = audioData[dataIndex];
      
      // Calculate bar height (0-1 normalized from audio data)
      const barHeight = (value / 255) * height;
      
      // Position bars from the middle
      const x = i * (barWidth + gap);
      const y = (height - barHeight) / 2;
      
      // Draw bar
      context.fillRect(x, y, barWidth, barHeight);
    }
    
    // Add subtle animation effect if active
    if (isActive) {
      context.fillStyle = `${barColor}20`; // 20% opacity
      context.fillRect(0, 0, width * Math.random() * 0.1, height);
    }
    
  }, [audioData, height, width, barWidth, gap, barColor, backgroundColor, isActive]);

  return (
    <canvas
      ref={canvasRef}
      height={height}
      width={width}
      className={className}
      style={{ 
        width: `${width}px`, 
        height: `${height}px` 
      }}
    />
  );
}

/**
 * AudioLevelMeter component that shows current audio input level
 */
export function AudioLevelMeter({
  level = 0,
  height = 20,
  width = 150,
  className = '',
  activeColor = '#22c55e', // green-500
  backgroundColor = '#e5e7eb', // gray-200
}: {
  level: number;
  height?: number;
  width?: number;
  className?: string;
  activeColor?: string;
  backgroundColor?: string;
}) {
  // Ensure level is between 0 and 1
  const normalizedLevel = Math.max(0, Math.min(1, level));
  
  return (
    <div 
      className={`relative rounded-full overflow-hidden ${className}`}
      style={{ height: `${height}px`, width: `${width}px`, backgroundColor }}
    >
      <div 
        className="absolute top-0 left-0 h-full transition-all duration-100 ease-out"
        style={{ 
          width: `${normalizedLevel * 100}%`, 
          backgroundColor: activeColor 
        }}
      />
    </div>
  );
}

/**
 * AudioMetricsDisplay component that shows audio buffer metrics
 */
export function AudioMetricsDisplay({
  metrics,
  className = '',
}: {
  metrics: {
    bufferSize: number;
    averageLatency: number;
    jitter: number;
    underruns: number;
    overruns: number;
  };
  className?: string;
}) {
  return (
    <div className={`text-xs text-gray-500 space-y-1 ${className}`}>
      <div className="flex justify-between">
        <span>Buffer:</span>
        <span className="font-mono">{metrics.bufferSize} chunks</span>
      </div>
      <div className="flex justify-between">
        <span>Latency:</span>
        <span className="font-mono">{Math.round(metrics.averageLatency)}ms</span>
      </div>
      <div className="flex justify-between">
        <span>Jitter:</span>
        <span className="font-mono">{Math.round(metrics.jitter)}ms</span>
      </div>
      <div className="flex justify-between">
        <span>Underruns:</span>
        <span className="font-mono">{metrics.underruns}</span>
      </div>
      <div className="flex justify-between">
        <span>Overruns:</span>
        <span className="font-mono">{metrics.overruns}</span>
      </div>
    </div>
  );
}
