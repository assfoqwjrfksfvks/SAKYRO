"use client";

import { useEffect, useRef, useState } from "react";

type Color = readonly [hue: number, saturation: number, lightness: number];
type Palette = readonly [Color, Color, Color];

const defaultPalette: Palette = [[262, 47, 21], [234, 46, 19], [316, 34, 18]];
const barCount = 72;
const initialBars = Array.from({ length: barCount }, (_, i) =>
  0.16 + 0.28 * Math.abs(Math.sin(i * 0.68) * Math.cos(i * 0.21)),
);

function hsl(red: number, green: number, blue: number): Color {
  const high = Math.max(red, green, blue);
  const low = Math.min(red, green, blue);
  const delta = high - low;
  const lightness = (high + low) / 2;
  if (delta === 0) return [0, 0, lightness];

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  const hue = high === red ? (green - blue) / delta
    : high === green ? (blue - red) / delta + 2 : (red - green) / delta + 4;
  return [(hue * 60 + 360) % 360, saturation, lightness];
}

function readPalette(image: HTMLImageElement): Palette {
  const sample = document.createElement("canvas");
  sample.width = 36;
  sample.height = 36;
  const context = sample.getContext("2d", { willReadFrequently: true });
  if (!context) return defaultPalette;

  context.drawImage(image, 0, 0, 36, 36);
  const pixels = context.getImageData(0, 0, 36, 36).data;
  const buckets = new Map<number, { hue: number; saturation: number; lightness: number; weight: number }>();
  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index + 3] < 196) continue;
    const [hue, saturation, lightness] = hsl(pixels[index] / 255, pixels[index + 1] / 255, pixels[index + 2] / 255);
    if (saturation < 0.13 || lightness < 0.037 || lightness > 0.95) continue;

    const key = Math.floor(hue / 24);
    const bucket = buckets.get(key) ?? { hue: 0, saturation: 0, lightness: 0, weight: 0 };
    const weight = saturation * Math.sqrt(lightness);
    bucket.hue += hue * weight;
    bucket.saturation += saturation * weight;
    bucket.lightness += lightness * weight;
    bucket.weight += weight;
    buckets.set(key, bucket);
  }

  const colors = [...buckets.values()].sort((first, second) => second.weight - first.weight);
  const distinct: Color[] = [];
  for (const { hue, saturation, lightness, weight } of colors) {
    const center = hue / weight;
    if (distinct.some(([other]) => Math.abs((center - other + 540) % 360 - 180) < 27)) continue;
    distinct.push([center, Math.min(69, Math.max(29, saturation / weight * 76)), Math.min(25, 16 + lightness / weight * 16)]);
    if (distinct.length === 3) break;
  }

  const primary = distinct[0];
  if (!primary) return defaultPalette;
  return [
    primary,
    distinct[1] ?? [(primary[0] + 28) % 360, primary[1] * 0.78, primary[2] * 0.88],
    distinct[2] ?? [(primary[0] + 330) % 360, primary[1] * 0.73, primary[2] * 0.81],
  ];
}

function interpolate(start: Color, end: Color, fraction: number): Color {
  const hueGap = (end[0] - start[0] + 540) % 360 - 180;
  return [
    (start[0] + hueGap * fraction + 360) % 360,
    start[1] + (end[1] - start[1]) * fraction,
    start[2] + (end[2] - start[2]) * fraction,
  ];
}

function createNoise(context: CanvasRenderingContext2D) {
  const tile = document.createElement("canvas");
  tile.width = 96;
  tile.height = 96;
  const texture = tile.getContext("2d");
  if (!texture) return null;

  const pixels = texture.createImageData(tile.width, tile.height);
  for (let index = 0; index < pixels.data.length; index += 4) {
    const gray = Math.floor(Math.random() * 160);
    pixels.data.set([gray, gray, gray, 255], index);
  }
  texture.putImageData(pixels, 0, 0);
  return context.createPattern(tile, "repeat");
}

export function useWaveBackdrop(source?: string) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const current = useRef<Palette>(defaultPalette);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !context) return;

    const noise = createNoise(context);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;

    const paint = () => {
      const width = canvas.width;
      const height = canvas.height;
      const clouds = [
        { x: 0.46, y: 0.45, size: 0.55, opacity: 0.88 },
        { x: 0.79, y: 0.76, size: 0.53, opacity: 0.56 },
        { x: 0.15, y: 0.20, size: 0.47, opacity: 0.52 },
      ];

      context.fillStyle = "#100d16";
      context.fillRect(0, 0, width, height);
      clouds.forEach(({ x, y, size, opacity }, index) => {
        const [hue, saturation, lightness] = current.current[index];
        const color = `${hue} ${saturation}% ${lightness}%`;
        const radius = Math.max(height, width) * size;
        const gradient = context.createRadialGradient(width * x, height * y, 0, width * x, height * y, radius);
        gradient.addColorStop(0, `hsl(${color} / ${opacity})`);
        gradient.addColorStop(0.48, `hsl(${color} / ${opacity * 0.43})`);
        gradient.addColorStop(1, `hsl(${color} / 0)`);
        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);
      });

      if (noise) {
        context.globalAlpha = 0.043;
        context.fillStyle = noise;
        context.fillRect(0, 0, width, height);
        context.globalAlpha = 1;
      }
    };

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(bounds.width * ratio));
      canvas.height = Math.max(1, Math.round(bounds.height * ratio));
      paint();
    };

    function moveTo(target: Palette) {
      window.cancelAnimationFrame(frame);
      if (reducedMotion.matches) {
        current.current = target;
        paint();
        return;
      }

      const previous = current.current;
      const started = performance.now();
      function advance(time: number) {
        const progress = Math.min(1, (time - started) / 1500);
        const eased = progress * progress * (3 - 2 * progress);
        current.current = [
          interpolate(previous[0], target[0], eased),
          interpolate(previous[1], target[1], eased),
          interpolate(previous[2], target[2], eased),
        ];
        paint();
        if (progress < 1) frame = window.requestAnimationFrame(advance);
      }
      frame = window.requestAnimationFrame(advance);
    }

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const image = new window.Image();
    if (source) {
      image.onload = () => {
        try {
          moveTo(readPalette(image));
        } catch {
          moveTo(defaultPalette);
        }
      };
      image.onerror = () => moveTo(defaultPalette);
      image.src = source;
    } else {
      moveTo(defaultPalette);
    }

    return () => {
      image.onload = null;
      image.onerror = null;
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [source]);

  return canvasRef;
}

function audioBars(track: AudioBuffer) {
  const samples = track.getChannelData(0);
  const sampleCount = samples.length;
  const envelope = Array.from({ length: barCount }, (_, index) => {
    const start = Math.floor(index * sampleCount / barCount);
    const end = Math.floor((index + 1) * sampleCount / barCount);
    let energy = 0;
    let count = 0;
    for (let position = start; position < end; position += 4) {
      energy += samples[position] ** 2;
      count++;
    }
    return Math.sqrt(energy / Math.max(1, count));
  });
  const peak = Math.max(0.02, Math.max(...envelope));
  return envelope.map((level) => Math.max(0.12, Math.min(1, (level / peak) ** 0.76)));
}

export function useWaveform(source?: string) {
  const [waveforms, setWaveforms] = useState<Record<string, number[]>>({});
  const decoded = source ? waveforms[source] : undefined;

  useEffect(() => {
    if (!source || decoded || !window.OfflineAudioContext) return;
    const request = new AbortController();

    async function decode(path: string) {
      try {
        const response = await fetch(path, { signal: request.signal });
        if (!response.ok) return;

        const encoded = await response.arrayBuffer();
        const context = new OfflineAudioContext(1, 1, 44100);
        const buffer = await context.decodeAudioData(encoded);
        if (request.signal.aborted) return;

        const bars = audioBars(buffer);
        setWaveforms((current) => ({ ...current, [path]: bars }));
      } catch {
        // Keep the interactive progress usable when the browser cannot decode the preview.
      }
    }

    void decode(source);
    return () => request.abort();
  }, [source, decoded]);

  return decoded ?? initialBars;
}
