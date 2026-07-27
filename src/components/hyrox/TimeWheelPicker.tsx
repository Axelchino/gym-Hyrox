import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useThemeTokens } from '../../utils/themeHelpers';

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5,...,55

function to24h(h12: number, m: number, meridiem: 'AM' | 'PM'): string {
  let h = h12 % 12;
  if (meridiem === 'PM') h += 12;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function from24h(value: string): { h12: number; m: number; meridiem: 'AM' | 'PM' } {
  const [hh, mm] = value.split(':').map((n) => parseInt(n, 10) || 0);
  const meridiem: 'AM' | 'PM' = hh >= 12 ? 'PM' : 'AM';
  let h12 = hh % 12;
  if (h12 === 0) h12 = 12;
  const m = (Math.round(mm / 5) * 5) % 60;
  return { h12, m, meridiem };
}

function formatDisplay(value: string): string {
  const { h12, m, meridiem } = from24h(value);
  return `${h12}:${String(m).padStart(2, '0')} ${meridiem}`;
}

// Accepts "5:30 PM", "5:30pm", or 24h "17:30" — whatever someone types.
function parseTypedTime(input: string): string | null {
  const trimmed = input.trim().toUpperCase();
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
  if (!match) return null;
  let hh = parseInt(match[1], 10);
  const mm = parseInt(match[2], 10);
  const meridiem = match[3];
  if (mm > 59) return null;
  if (meridiem) {
    if (hh < 1 || hh > 12) return null;
    hh = hh % 12;
    if (meridiem === 'PM') hh += 12;
  } else if (hh > 23) {
    return null;
  }
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function cycle<T>(options: T[], current: T, direction: 1 | -1): T {
  const idx = options.indexOf(current);
  const next = (idx + direction + options.length) % options.length;
  return options[next];
}

// A single up/down stepper: a big, unambiguous number/label with two large
// tap targets around it. Replaces an earlier scroll-wheel version that
// turned out unreliable on touch (a tiny 3-item scroll region is a classic
// bad mobile pattern — easy to misfire as a tap, hard to tell what's
// "selected") and low-contrast (showing several dimmed values at once).
// Here there's only ever one value visible per column, so there's nothing
// to misread.
function Stepper({ label, onUp, onDown }: { label: string; onUp: () => void; onDown: () => void }) {
  const tokens = useThemeTokens();
  const btnStyle: CSSProperties = {
    WebkitAppearance: 'none', appearance: 'none',
    width: 44, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
    border: '1px solid var(--border-subtle)', background: tokens.surface.primary, color: tokens.text.primary,
    borderRadius: 6,
  };
  return (
    <div style={{ textAlign: 'center' }}>
      <button type="button" onClick={onUp} style={btnStyle} aria-label="increase"><ChevronUp size={18} /></button>
      <div className="font-black" style={{ fontSize: 22, color: tokens.text.primary, padding: '6px 0' }}>{label}</div>
      <button type="button" onClick={onDown} style={btnStyle} aria-label="decrease"><ChevronDown size={18} /></button>
    </div>
  );
}

/**
 * Replaces the native <input type="time"> (tiny, inconsistent across
 * browsers) with a tap-to-step picker — hour / minute / AM-PM columns,
 * each a big number with up/down buttons — plus a text field for typing
 * the time directly. Value/onChange stay in 24h "HH:MM" to match the
 * existing `times` state shape used for the .ics export.
 */
export function TimeWheelPicker({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const tokens = useThemeTokens();
  const [open, setOpen] = useState(false);
  const [textValue, setTextValue] = useState(() => formatDisplay(value));
  const { h12, m, meridiem } = from24h(value);

  useEffect(() => { setTextValue(formatDisplay(value)); }, [value]);

  const set = (patch: Partial<{ h12: number; m: number; meridiem: 'AM' | 'PM' }>) => {
    onChange(to24h(patch.h12 ?? h12, patch.m ?? m, patch.meridiem ?? meridiem));
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="w-full text-left px-2 py-1.5 rounded text-sm font-semibold"
        style={{
          WebkitAppearance: 'none', appearance: 'none',
          border: '1px solid var(--border-subtle)', background: tokens.surface.primary,
          color: tokens.text.primary, opacity: disabled ? 0.5 : 1,
        }}
      >
        {formatDisplay(value)}
      </button>
      {open && !disabled && (
        <div
          style={{
            position: 'absolute', zIndex: 20, top: '100%', left: 0, marginTop: 4,
            background: tokens.surface.elevated, border: '1px solid var(--border-subtle)',
            borderRadius: 8, padding: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.2)', width: 210,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
            <Stepper
              label={String(h12)}
              onUp={() => set({ h12: cycle(HOURS, h12, 1) })}
              onDown={() => set({ h12: cycle(HOURS, h12, -1) })}
            />
            <Stepper
              label={String(m).padStart(2, '0')}
              onUp={() => set({ m: cycle(MINUTES, m, 1) })}
              onDown={() => set({ m: cycle(MINUTES, m, -1) })}
            />
            <Stepper
              label={meridiem}
              onUp={() => set({ meridiem: meridiem === 'AM' ? 'PM' : 'AM' })}
              onDown={() => set({ meridiem: meridiem === 'AM' ? 'PM' : 'AM' })}
            />
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
            <input
              type="text" value={textValue} placeholder="e.g. 5:30 PM"
              onChange={(e) => setTextValue(e.target.value)}
              onBlur={() => {
                const parsed = parseTypedTime(textValue);
                if (parsed) onChange(parsed); else setTextValue(formatDisplay(value));
              }}
              className="flex-1 px-2 py-1 rounded text-xs"
              style={{ WebkitAppearance: 'none', border: '1px solid var(--border-subtle)', background: tokens.surface.primary, color: tokens.text.primary }}
            />
            <button
              type="button" onClick={() => setOpen(false)}
              className="px-2 py-1 rounded text-xs font-bold"
              style={{ WebkitAppearance: 'none', appearance: 'none', background: tokens.button.primaryBg, color: tokens.button.primaryText }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
