import React from 'react';

interface PresetOption {
  id: string;
  label: string;
}

interface PresetPickerProps<T extends PresetOption> {
  options: T[];
  selectedId: string;
  onSelect: (id: string) => void;
  renderSwatch: (option: T) => React.ReactNode;
  disabled?: boolean;
}

export default function PresetPicker<T extends PresetOption>({ options, selectedId, onSelect, renderSwatch, disabled }: PresetPickerProps<T>) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
      {options.map((option) => {
        const selected = option.id === selectedId;
        return (
          <button key={option.id} type="button" disabled={disabled} onClick={() => onSelect(option.id)} aria-label={option.label} aria-pressed={selected}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', background: 'none', border: 'none', padding: 0, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
            <div style={{ padding: '3px', borderRadius: '10px', border: `2px solid ${selected ? 'var(--tt-accent)' : 'transparent'}`, boxShadow: selected ? '0 0 12px color-mix(in srgb, var(--tt-accent) 45%, transparent)' : 'none' }}>
              {renderSwatch(option)}
            </div>
            <span style={{ fontSize: '0.62rem', color: selected ? 'var(--tt-accent)' : 'rgba(255,255,255,0.5)', letterSpacing: '0.05em' }}>
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
