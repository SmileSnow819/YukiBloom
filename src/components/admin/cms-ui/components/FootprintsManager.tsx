import { Button } from '@admin-ui/components/ui/button';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getFootprintsValidationError } from '@/lib/admin/content-validation';
import { type FootprintsContent, getAdminFootprints, saveAdminFootprints } from '@/lib/admin/footprints';
import { moveItem, withSortOrder } from '@/lib/admin/ordered-list';
import type { PublicLocation, PublicRoute, PublicStay } from '@/lib/public-api/types';

type CollectionKey = 'locations' | 'stays' | 'routes';

const emptyLocation = (): PublicLocation => ({
  id: crypto.randomUUID(),
  name: '',
  type: '',
  lat: 0,
  lng: 0,
  icon: '',
  sortOrder: 0,
});

const emptyStay = (): PublicStay => ({
  id: crypto.randomUUID(),
  locationId: '',
  title: '',
  type: '',
  description: '',
  startDate: '',
  endDate: '',
  isPresent: false,
  sortOrder: 0,
});

const emptyRoute = (): PublicRoute => ({
  id: crypto.randomUUID(),
  from: '',
  to: '',
  date: '',
  label: '',
  transport: '',
  description: '',
  images: [],
  sortOrder: 0,
});

export function FootprintsManager() {
  const [footprints, setFootprints] = useState<FootprintsContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setFootprints(await getAdminFootprints());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '读取足迹失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  function updateItem<K extends CollectionKey>(key: K, index: number, changes: Partial<FootprintsContent[K][number]>) {
    setFootprints((current) =>
      current
        ? {
            ...current,
            [key]: current[key].map((item, itemIndex) => (itemIndex === index ? { ...item, ...changes } : item)),
          }
        : current,
    );
  }

  function move<K extends CollectionKey>(key: K, index: number, offset: number) {
    setFootprints((current) => {
      if (!current) return current;
      switch (key) {
        case 'locations':
          return { ...current, locations: withSortOrder(moveItem(current.locations, index, index + offset)) };
        case 'stays':
          return { ...current, stays: withSortOrder(moveItem(current.stays, index, index + offset)) };
        case 'routes':
          return { ...current, routes: withSortOrder(moveItem(current.routes, index, index + offset)) };
      }
    });
  }

  function add<K extends CollectionKey>(key: K, item: FootprintsContent[K][number]) {
    setFootprints((current) => (current ? { ...current, [key]: [...current[key], item] } : current));
  }

  function remove<K extends CollectionKey>(key: K, index: number) {
    setFootprints((current) =>
      current ? { ...current, [key]: withSortOrder(current[key].filter((_, itemIndex) => itemIndex !== index)) } : current,
    );
  }

  async function save() {
    if (!footprints) return;
    const validationError = getFootprintsValidationError(footprints);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setSaving(true);
    try {
      const input: FootprintsContent = {
        ...footprints,
        locations: withSortOrder(footprints.locations),
        stays: withSortOrder(footprints.stays),
        routes: withSortOrder(footprints.routes),
      };
      setFootprints(await saveAdminFootprints(input));
      toast.success('足迹已保存');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : '保存足迹失败');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <ManagerMessage>正在读取足迹…</ManagerMessage>;
  if (error) return <ManagerError message={error} onRetry={reload} />;
  if (!footprints) return null;

  return (
    <section className="space-y-8" aria-label="足迹管理">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-lg">足迹</h3>
          <p className="text-muted-foreground text-sm">管理地点、停留记录和地点之间的路线。</p>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? '保存中…' : '保存全部足迹'}
        </Button>
      </div>

      <CollectionHeading title="地点" count={footprints.locations.length} onAdd={() => add('locations', emptyLocation())} />
      <div className="grid gap-4 xl:grid-cols-2">
        {footprints.locations.map((location, index) => (
          <article key={location.id} className="space-y-4 rounded-xl border border-border bg-card p-5">
            <ItemHeading
              title={location.name || `地点 ${index + 1}`}
              index={index}
              length={footprints.locations.length}
              onMove={(offset) => move('locations', index, offset)}
              onRemove={() => {
                const linkedStays = footprints.stays.filter((stay) => stay.locationId === location.id);
                if (
                  linkedStays.length &&
                  !window.confirm(`该地点关联 ${linkedStays.length} 条停留记录，删除地点也会删除这些记录。继续吗？`)
                )
                  return;
                setFootprints({
                  ...footprints,
                  locations: withSortOrder(footprints.locations.filter((_, itemIndex) => itemIndex !== index)),
                  stays: withSortOrder(footprints.stays.filter((stay) => stay.locationId !== location.id)),
                });
              }}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="名称"
                value={location.name}
                onChange={(name) => updateItem('locations', index, { name })}
                required
              />
              <Field
                label="类型"
                value={location.type}
                onChange={(type) => updateItem('locations', index, { type })}
                placeholder="city / country"
              />
              <NumberField label="纬度" value={location.lat} onChange={(lat) => updateItem('locations', index, { lat })} />
              <NumberField label="经度" value={location.lng} onChange={(lng) => updateItem('locations', index, { lng })} />
              <Field
                label="图标"
                value={location.icon}
                onChange={(icon) => updateItem('locations', index, { icon })}
                placeholder="ri:map-pin-line"
              />
            </div>
            <code className="block break-all text-muted-foreground text-xs">ID：{location.id}</code>
          </article>
        ))}
      </div>

      <CollectionHeading
        title="停留记录"
        count={footprints.stays.length}
        onAdd={() => add('stays', { ...emptyStay(), locationId: footprints.locations[0]?.id || '' })}
      />
      <div className="space-y-4">
        {footprints.stays.map((stay, index) => (
          <article key={stay.id} className="space-y-4 rounded-xl border border-border bg-card p-5">
            <ItemHeading
              title={stay.title || `停留 ${index + 1}`}
              index={index}
              length={footprints.stays.length}
              onMove={(offset) => move('stays', index, offset)}
              onRemove={() => remove('stays', index)}
            />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <Field label="标题" value={stay.title} onChange={(title) => updateItem('stays', index, { title })} required />
              <label className="block space-y-1.5 text-sm">
                <span className="font-medium">所属地点</span>
                <select
                  value={stay.locationId}
                  onChange={(event) => updateItem('stays', index, { locationId: event.target.value })}
                  required
                  className="w-full rounded-lg border border-input bg-background px-3 py-2"
                >
                  <option value="">选择地点</option>
                  {footprints.locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name || location.id}
                    </option>
                  ))}
                </select>
              </label>
              <Field label="类型" value={stay.type} onChange={(type) => updateItem('stays', index, { type })} />
              <Field
                label="开始日期"
                value={stay.startDate}
                onChange={(startDate) => updateItem('stays', index, { startDate })}
                placeholder="2026.08"
                required
              />
              <Field
                label="结束日期"
                value={stay.endDate}
                onChange={(endDate) => updateItem('stays', index, { endDate })}
                placeholder="2026.08"
                disabled={stay.isPresent}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={stay.isPresent}
                onChange={(event) =>
                  updateItem('stays', index, {
                    isPresent: event.target.checked,
                    endDate: event.target.checked ? '' : stay.endDate,
                  })
                }
              />
              目前仍在此停留
            </label>
            <TextArea
              label="描述"
              value={stay.description}
              onChange={(description) => updateItem('stays', index, { description })}
            />
            <code className="block break-all text-muted-foreground text-xs">ID：{stay.id}</code>
          </article>
        ))}
      </div>

      <CollectionHeading title="路线" count={footprints.routes.length} onAdd={() => add('routes', emptyRoute())} />
      <div className="space-y-4">
        {footprints.routes.map((route, index) => (
          <article key={route.id} className="space-y-4 rounded-xl border border-border bg-card p-5">
            <ItemHeading
              title={route.label || `${route.from} → ${route.to}` || `路线 ${index + 1}`}
              index={index}
              length={footprints.routes.length}
              onMove={(offset) => move('routes', index, offset)}
              onRemove={() => remove('routes', index)}
            />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <Field label="出发地" value={route.from} onChange={(from) => updateItem('routes', index, { from })} required />
              <Field label="目的地" value={route.to} onChange={(to) => updateItem('routes', index, { to })} required />
              <Field
                label="日期"
                value={route.date}
                onChange={(date) => updateItem('routes', index, { date })}
                placeholder="2026.03.12"
              />
              <Field label="标签" value={route.label} onChange={(label) => updateItem('routes', index, { label })} />
              <Field
                label="交通方式"
                value={route.transport}
                onChange={(transport) => updateItem('routes', index, { transport })}
              />
            </div>
            <TextArea
              label="描述"
              value={route.description}
              onChange={(description) => updateItem('routes', index, { description })}
            />
            <TextArea
              label="图片 URL（每行一条）"
              value={route.images.join('\n')}
              onChange={(value) =>
                updateItem('routes', index, {
                  images: value
                    .split('\n')
                    .map((url) => url.trim())
                    .filter(Boolean),
                })
              }
              rows={3}
            />
            <code className="block break-all text-muted-foreground text-xs">ID：{route.id}</code>
          </article>
        ))}
      </div>
    </section>
  );
}

function CollectionHeading({ title, count, onAdd }: { title: string; count: number; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between border-border border-b pb-2">
      <h4 className="font-semibold">
        {title} <span className="font-normal text-muted-foreground">({count})</span>
      </h4>
      <Button variant="outline" size="sm" onClick={onAdd}>
        新增{title}
      </Button>
    </div>
  );
}

function ItemHeading({
  title,
  index,
  length,
  onMove,
  onRemove,
}: {
  title: string;
  index: number;
  length: number;
  onMove: (offset: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h5 className="font-medium">{title}</h5>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={index === 0} onClick={() => onMove(-1)}>
          上移
        </Button>
        <Button variant="outline" size="sm" disabled={index === length - 1} onClick={() => onMove(1)}>
          下移
        </Button>
        <Button variant="destructive" size="sm" onClick={onRemove}>
          删除
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 disabled:opacity-50"
      />
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <input
        type="number"
        step="any"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full rounded-lg border border-input bg-background px-3 py-2"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 2,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        className="w-full rounded-lg border border-input bg-background px-3 py-2"
      />
    </label>
  );
}

function ManagerMessage({ children }: { children: React.ReactNode }) {
  return <div className="flex h-64 items-center justify-center text-muted-foreground">{children}</div>;
}

function ManagerError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex h-64 flex-col items-center justify-center gap-4">
      <p className="text-destructive">{message}</p>
      <Button variant="outline" onClick={onRetry}>
        重试
      </Button>
    </div>
  );
}
