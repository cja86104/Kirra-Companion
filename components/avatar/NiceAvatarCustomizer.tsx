'use client';

/**
 * NICE AVATAR CUSTOMIZER
 * 
 * Complete avatar customization using react-nice-avatar library.
 * Provides live preview and controls for all avatar options.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import Avatar, { genConfig } from 'react-nice-avatar';
import { Shuffle, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils/cn';
import {
  NiceAvatarConfig,
  DEFAULT_NICE_AVATAR_CONFIG,
  getRandomConfig,
  mergeNiceAvatarConfig,
  SEX_OPTIONS,
  EAR_SIZE_OPTIONS,
  HAIR_STYLE_OPTIONS,
  HAT_STYLE_OPTIONS,
  EYE_STYLE_OPTIONS,
  GLASSES_STYLE_OPTIONS,
  NOSE_STYLE_OPTIONS,
  MOUTH_STYLE_OPTIONS,
  SHIRT_STYLE_OPTIONS,
  SKIN_COLOR_PRESETS,
  HAIR_COLOR_PRESETS,
  SHIRT_COLOR_PRESETS,
  BG_COLOR_PRESETS,
} from '@/types/nice-avatar';

// ============================================================================
// TYPES
// ============================================================================

interface NiceAvatarCustomizerProps {
  initialConfig?: Partial<NiceAvatarConfig> | null;
  onChange?: (config: NiceAvatarConfig) => void;
  className?: string;
  compact?: boolean;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function ColorPicker({
  label,
  value,
  onChange,
  presets,
}: {
  label: string;
  value: string;
  onChange: (color: string) => void;
  presets: { name: string; hex: string }[];
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 w-full p-2 rounded-lg border border-border hover:border-primary/50 transition-colors"
        >
          <div className="w-6 h-6 rounded-full border border-border" style={{ backgroundColor: value }} />
          <span className="text-sm flex-1 text-left">{value}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {isOpen && (
          <div className="absolute z-20 mt-1 p-2 bg-popover border border-border rounded-lg shadow-lg w-full">
            <div className="grid grid-cols-6 gap-1 mb-2">
              {presets.map((preset) => (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => {
                    onChange(preset.hex);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-7 h-7 rounded-full border-2 transition-all hover:scale-110',
                    value.toLowerCase() === preset.hex.toLowerCase() ? 'border-primary' : 'border-transparent'
                  )}
                  style={{ backgroundColor: preset.hex }}
                  title={preset.name}
                />
              ))}
            </div>
            <input
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="w-full h-8 cursor-pointer rounded"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function OptionButtons<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap gap-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              'px-3 py-1.5 text-xs rounded-md border transition-all',
              value === option.value
                ? 'border-primary bg-primary/10 text-primary font-medium'
                : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border last:border-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-3 text-sm font-medium"
      >
        {title}
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {isOpen && <div className="pb-4 space-y-4">{children}</div>}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function NiceAvatarCustomizer({
  initialConfig = null,
  onChange,
  className = '',
  compact = false,
}: NiceAvatarCustomizerProps) {
  const [config, setConfig] = useState<NiceAvatarConfig>(() =>
    mergeNiceAvatarConfig(initialConfig)
  );
  const isFirstRender = useRef(true);

  const updateConfig = useCallback(
    <K extends keyof NiceAvatarConfig>(key: K, value: NiceAvatarConfig[K]) => {
      setConfig((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  // Notify parent of changes (skip first render to avoid setState during render)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    onChange?.(config);
  }, [config, onChange]);

  const handleRandomize = () => {
    setConfig(getRandomConfig());
  };

  const handleReset = () => {
    setConfig(initialConfig ? mergeNiceAvatarConfig(initialConfig) : DEFAULT_NICE_AVATAR_CONFIG);
  };

  return (
    <div className={cn('flex flex-col lg:flex-row gap-4', className)}>
      {/* Preview Panel */}
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-xl border border-border bg-card p-6',
          compact ? 'lg:w-[200px]' : 'lg:w-[280px]'
        )}
      >
        <div
          className={cn(
            'rounded-full overflow-hidden mb-4',
            compact ? 'w-32 h-32' : 'w-48 h-48'
          )}
          style={{ backgroundColor: config.bgColor }}
        >
          <Avatar
            style={{ width: '100%', height: '100%' }}
            {...config}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRandomize}>
            <Shuffle className="w-4 h-4 mr-1" />
            Random
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset
          </Button>
        </div>
      </div>

      {/* Controls Panel */}
      <div
        className={cn(
          'flex-1 rounded-xl border border-border bg-card p-4',
          compact ? 'max-h-[400px]' : 'max-h-[550px]',
          'overflow-y-auto'
        )}
      >
        {/* Body Section */}
        <Section title="Body" defaultOpen={true}>
          <OptionButtons
            label="Style"
            value={config.sex}
            options={SEX_OPTIONS}
            onChange={(v) => updateConfig('sex', v)}
          />
          <ColorPicker
            label="Skin Color"
            value={config.faceColor}
            onChange={(v) => updateConfig('faceColor', v)}
            presets={SKIN_COLOR_PRESETS}
          />
          <OptionButtons
            label="Ear Size"
            value={config.earSize}
            options={EAR_SIZE_OPTIONS}
            onChange={(v) => updateConfig('earSize', v)}
          />
        </Section>

        {/* Hair Section */}
        <Section title="Hair" defaultOpen={true}>
          <OptionButtons
            label="Style"
            value={config.hairStyle}
            options={HAIR_STYLE_OPTIONS}
            onChange={(v) => updateConfig('hairStyle', v)}
          />
          <ColorPicker
            label="Hair Color"
            value={config.hairColor}
            onChange={(v) => updateConfig('hairColor', v)}
            presets={HAIR_COLOR_PRESETS}
          />
          <OptionButtons
            label="Hat"
            value={config.hatStyle}
            options={HAT_STYLE_OPTIONS}
            onChange={(v) => updateConfig('hatStyle', v)}
          />
        </Section>

        {/* Face Section */}
        <Section title="Face" defaultOpen={true}>
          <OptionButtons
            label="Eyes"
            value={config.eyeStyle}
            options={EYE_STYLE_OPTIONS}
            onChange={(v) => updateConfig('eyeStyle', v)}
          />
          <OptionButtons
            label="Glasses"
            value={config.glassesStyle}
            options={GLASSES_STYLE_OPTIONS}
            onChange={(v) => updateConfig('glassesStyle', v)}
          />
          <OptionButtons
            label="Nose"
            value={config.noseStyle}
            options={NOSE_STYLE_OPTIONS}
            onChange={(v) => updateConfig('noseStyle', v)}
          />
          <OptionButtons
            label="Mouth"
            value={config.mouthStyle}
            options={MOUTH_STYLE_OPTIONS}
            onChange={(v) => updateConfig('mouthStyle', v)}
          />
        </Section>

        {/* Clothing Section */}
        <Section title="Clothing" defaultOpen={false}>
          <OptionButtons
            label="Shirt Style"
            value={config.shirtStyle}
            options={SHIRT_STYLE_OPTIONS}
            onChange={(v) => updateConfig('shirtStyle', v)}
          />
          <ColorPicker
            label="Shirt Color"
            value={config.shirtColor}
            onChange={(v) => updateConfig('shirtColor', v)}
            presets={SHIRT_COLOR_PRESETS}
          />
        </Section>

        {/* Background Section */}
        <Section title="Background" defaultOpen={false}>
          <ColorPicker
            label="Background Color"
            value={config.bgColor}
            onChange={(v) => updateConfig('bgColor', v)}
            presets={BG_COLOR_PRESETS}
          />
        </Section>
      </div>
    </div>
  );
}

export default NiceAvatarCustomizer;
