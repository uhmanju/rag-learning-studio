interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  explanation?: string;
  disabled?: boolean;
  onChange: (v: number) => void;
}

export function ParamSlider({ label, value, min, max, step, unit = "", explanation, disabled = false, onChange }: Props) {
  return (
    <label className={`flex items-center gap-2 text-[12px] text-text-muted ${disabled ? "opacity-50" : ""}`} title={explanation}>
      {label}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-accent-fill disabled:cursor-not-allowed"
      />
      <span className="font-mono text-[12px] font-semibold text-text">
        {value}
        {unit}
      </span>
    </label>
  );
}
