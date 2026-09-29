import { Icon } from '@iconify/react';

export function IconPreview({ icon, color }: { icon: string; color?: string }) {
  if (!icon.trim()) {
    return <span className="flex size-10 shrink-0 items-center justify-center text-muted-foreground">—</span>;
  }

  return (
    <span className="flex size-10 shrink-0 items-center justify-center">
      <Icon icon={icon} className="size-5" style={color ? { color } : undefined} aria-hidden="true" />
    </span>
  );
}

export function IconField({
  label,
  value,
  onChange,
  placeholder,
  color,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  color?: string;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <span className="flex items-center gap-3">
        <IconPreview icon={value} color={color} />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2"
        />
      </span>
    </label>
  );
}
