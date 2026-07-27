import { useEffect, useRef, useState } from 'react';
import { useThemeTokens } from '../../utils/themeHelpers';

const ITEM_HEIGHT = 32;
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const MERIDIEMS: ('AM' | 'PM')[] = ['AM', 'PM'];

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

function WheelColumn<T extends string | number>({
  options, value, onChange, format,
}: { options: T[]; value: T; onChange: (v: T) => void; format: (v: T) => string }) {
  const ref = useRef<HTMLDivElement>(null);
  const scrollTimeout = useRef<number | undefined>(undefined);
  const tokens = useThemeTokens();

  // Position to the current value once, when the wheel first mounts (i.e. each time the popover opens).
  useEffect(() => {
    const idx = options.indexOf(value);
    if (ref.current && idx >= 0) ref.current.scrollTop = idx * ITEM_HEIGHT;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = () => {
    if (scrollTimeout.current) window.clearTimeout(scrollTimeout.current);
    scrollTimeout.current = window.setTimeout(() => {
      if (!ref.current) return;
      const idx = Math.round(ref.current.scrollTop / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(options.length - 1, idx));
      if (options[clamped] !== value) onChange(options[clamped]);
    }, 100);
  };

  return (
    <div
      ref={ref}
      onScroll={handleScroll}
      className="hyrox-wheel-col"
      style={{ height: ITEM_HEIGHT * 3, overflowY: 'auto', scrollSnapType: 'y mandatory', width: 52, textAlign: 'center' }}
    >
      <div style={{ height: ITEM_HEIGHT }} />
      {options.map((o) => (
        <div
          key={String(o)}
          onClick={() => onChange(o)}
          style={{
            height: ITEM_HEIGHT, lineHeight: `${ITEM_HEIGHT}px`, scrollSnapAlign: 'center',
            fontWeight: o === value ? 800 : 500,
            color: o === value ? tokens.text.primary : tokens.text.secondary,
            cursor: 'pointer', fontSize: o === value ? 16 : 14,
          }}
        >
          {format(o)}
        </div>
      ))}
      <div style={{ height: ITEM_HEIGHT }} />
    </div>
  );
}

/**
 * Replaces the native <input type="time"> (tiny, inconsistent across
 * browsers) with a scroll-to-pick wheel — hour / minute / AM-PM columns
 * with scroll-snap — plus a text field for people who'd rather just type
 * the time directly. Value/onChange stay in 24h "HH:MM" to match the
 * existing `times` state shape used for the .ics export.
 */
function formatDisplay(value: string): string {
  const { h12, m, meridiem } = from24h(value);
  return `${h12}:${String(m).padStart(2, '0')} ${meridiem}`;
}

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
      <style>{`.hyrox-wheel-col::-webkit-scrollbar { display: none; } .hyrox-wheel-col { scrollbar-width: none; }`}</style>
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
        {h12}:{String(m).padStart(2, '0')} {meridiem}
      </button>
      {open && !disabled && (
        <div
          style={{
            position: 'absolute', zIndex: 20, top: '100%', left: 0, marginTop: 4,
            background: tokens.surface.elevated, border: '1px solid var(--border-subtle)',
            borderRadius: 8, padding: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.2)', width: 200,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', gap: 4, position: 'relative' }}>
            <div style={{ position: 'absolute', top: ITEM_HEIGHT, left: 0, right: 0, height: ITEM_HEIGHT, background: tokens.surface.accent, borderRadius: 6, pointerEvents: 'none' }} />
            <WheelColumn options={HOURS} value={h12} onChange={(v) => set({ h12: v })} format={(v) => String(v)} />
            <WheelColumn options={MINUTES} value={m} onChange={(v) => set({ m: v })} format={(v) => String(v).padStart(2, '0')} />
            <WheelColumn options={MERIDIEMS} value={meridiem} onChange={(v) => set({ meridiem: v })} format={(v) => v} />
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
