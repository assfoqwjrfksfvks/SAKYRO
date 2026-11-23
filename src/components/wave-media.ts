"use client";

import { useEffect, useRef, useState } from "react";

type Color = readonly [hue: number, saturation: number, lightness: number];
type Palette = readonly [Color, Color, Color];

const defaultPalette: Palette = [[222, 82, 49], [215, 29, 48], [222, 70, 35]];
const referenceCoverHue = 229;
const waveClouds = [
  { color: 1, x: 0.57, y: 0.35, width: 0.42, height: 0.38, angle: -0.38, opacity: 0.69 },
  { color: 1, x: 0.25, y: 0.25, width: 0.30, height: 0.32, angle: -0.36, opacity: 0.43 },
  { color: 2, x: 0.56, y: 0.83, width: 0.40, height: 0.32, angle: -0.38, opacity: 0.59 },
  { color: 0, x: 0.31, y: 0.61, width: 0.36, height: 0.38, angle: -0.46, opacity: 0.72 },
  { color: 0, x: 0.73, y: 0.28, width: 0.32, height: 0.35, angle: -0.53, opacity: 0.69 },
] as const;
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

function tintCloud(sample: Color, primary: Color, anchor: Color, influence: number): Color {
  const offset = (sample[0] - primary[0] + 540) % 360 - 180;
  const hue = (360 + anchor[0] + primary[0] - referenceCoverHue + Math.min(19, Math.max(-19, offset * influence))) % 360;
  return [hue, anchor[1] * 0.82 + sample[1] * 0.18, anchor[2] + (sample[2] - 38) * 0.11];
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
    distinct.push([center, saturation / weight * 100, lightness / weight * 100]);
    if (distinct.length === 3) break;
  }

  const primary = distinct[0];
  if (!primary) return defaultPalette;
  return [
    tintCloud(primary, primary, defaultPalette[0], 0),
    tintCloud(distinct[1] ?? primary, primary, defaultPalette[1], 0.16),
    tintCloud(distinct[2] ?? primary, primary, defaultPalette[2], 0.27),
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
      canvas.parentElement?.style.setProperty("--wave-halo-hue", `${current.current[0][0]}`);
      context.fillStyle = "#070c17";
      context.fillRect(0, 0, width, height);
      for (const cloud of waveClouds) {
        const [hue, saturation, lightness] = current.current[cloud.color];
        const tone = `${hue} ${saturation}% ${lightness}%`;
        context.save();
        context.translate(width * cloud.x, height * cloud.y);
        context.rotate(cloud.angle);
        context.scale(width * cloud.width, height * cloud.height);
        const gradient = context.createRadialGradient(0, 0, 0, 0, 0, 1);
        gradient.addColorStop(0, `hsl(${tone} / ${cloud.opacity})`);
        gradient.addColorStop(0.38, `hsl(${tone} / ${cloud.opacity * 0.67})`);
        gradient.addColorStop(0.67, `hsl(${tone} / ${cloud.opacity * 0.28})`);
        gradient.addColorStop(1, `hsl(${tone} / 0)`);
        context.fillStyle = gradient;
        context.fillRect(-1, -1, 2, 2);
        context.restore();
      }

      context.save();
      context.translate(width * 0.52, height * 0.52);
      context.scale(width * 0.61, height * 0.65);
      const vignette = context.createRadialGradient(0, 0, 0, 0, 0, 1);
      vignette.addColorStop(0.30, "#060a1400");
      vignette.addColorStop(0.60, "#060a141e");
      vignette.addColorStop(0.82, "#060a1473");
      vignette.addColorStop(1, "#060a14e8");
      context.fillStyle = vignette;
      context.fillRect(-1, -1, 2, 2);
      context.restore();

      const topShade = context.createLinearGradient(0, 0, 0, height * 0.32);
      topShade.addColorStop(0, "#050914de");
      topShade.addColorStop(0.48, "#05091469");
      topShade.addColorStop(1, "#05091400");
      context.fillStyle = topShade;
      context.fillRect(0, 0, width, height * 0.32);

      if (noise) {
        context.globalAlpha = 0.029;
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
