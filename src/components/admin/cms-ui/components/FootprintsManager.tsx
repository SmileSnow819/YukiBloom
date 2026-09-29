import { IconField, IconPreview } from '@admin-ui/components/IconField';
import { ManagerTable } from '@admin-ui/components/ManagerTable';
import { RecordId } from '@admin-ui/components/RecordId';
import { Button } from '@admin-ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@admin-ui/components/ui/dialog';
import { Icon } from '@iconify/react';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getFootprintsValidationError } from '@/lib/admin/content-validation';
import { type FootprintsContent, getAdminFootprints, saveAdminFootprints } from '@/lib/admin/footprints';
import { getNextSortOrder, sortBySortOrder } from '@/lib/admin/ordered-list';
import type { PublicLocation, PublicRoute, PublicStay } from '@/lib/public-api/types';

type CollectionKey = 'locations' | 'stays' | 'routes';
type FootprintEditor =
  | { kind: 'location'; index: number | null; item: PublicLocation }
  | { kind: 'stay'; index: number | null; item: PublicStay }
  | { kind: 'route'; index: number | null; item: PublicRoute };

const emptyLocation = (): PublicLocation => ({
  id: crypto.randomUUID(),
  name: '',
  type: '',
  lat: 0,
  lng: 0,
  icon: '',
  sortOrder: 0,
});
const emptyStay = (locationId = ''): PublicStay => ({
  id: crypto.randomUUID(),
  locationId,
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

export function FootprintsManager({ onToolbarChange }: { onToolbarChange: (actions: ReactNode | null) => void }) {
  const [footprints, setFootprints] = useState<FootprintsContent | null>(null);
  const [editor, setEditor] = useState<FootprintEditor | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAdminFootprints();
      setFootprints({
        ...data,
        locations: sortBySortOrder(data.locations),
        stays: sortBySortOrder(data.stays),
        routes: sortBySortOrder(data.routes),
      });
      setDirty(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '读取足迹失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  function applyEditor() {
    if (!footprints || !editor) return;
    if (!Number.isInteger(editor.item.sortOrder) || editor.item.sortOrder < 0) {
      toast.error('排序值必须是大于等于 0 的整数。');
      return;
    }
    let next: FootprintsContent;
    if (editor.kind === 'location') {
      if (!editor.item.name.trim() || !Number.isFinite(editor.item.lat) || !Number.isFinite(editor.item.lng)) {
        toast.error('请填写地点名称、有效纬度和经度。');
        return;
      }
      const locations = [...footprints.locations];
      if (editor.index === null) locations.push(editor.item);
      else locations[editor.index] = editor.item;
      next = { ...footprints, locations: sortBySortOrder(locations) };
    } else if (editor.kind === 'stay') {
      if (
        !editor.item.title.trim() ||
        !editor.item.startDate.trim() ||
        !footprints.locations.some((location) => location.id === editor.item.locationId)
      ) {
        toast.error('请填写停留标题、开始日期和有效的所属地点。');
        return;
      }
      const stays = [...footprints.stays];
      if (editor.index === null) stays.push(editor.item);
      else stays[editor.index] = editor.item;
      next = { ...footprints, stays: sortBySortOrder(stays) };
    } else {
      if (!editor.item.from.trim() || !editor.item.to.trim()) {
        toast.error('请填写路线的出发地和目的地。');
        return;
      }
      const routes = [...footprints.routes];
      if (editor.index === null) routes.push(editor.item);
      else routes[editor.index] = editor.item;
      next = { ...footprints, routes: sortBySortOrder(routes) };
    }
    setFootprints(next);
    setDirty(true);
    setEditor(null);
  }

  function removeItem(kind: CollectionKey, index: number) {
    if (!footprints) return;
    if (kind === 'locations') {
      const location = footprints.locations[index];
      const linkedStays = footprints.stays.filter((stay) => stay.locationId === location.id);
      const message = linkedStays.length
        ? `“${location.name}”关联 ${linkedStays.length} 条停留记录，删除地点也会删除这些记录。继续吗？`
        : `确定删除地点“${location.name}”吗？`;
      if (!window.confirm(message)) return;
      setFootprints({
        ...footprints,
        locations: sortBySortOrder(footprints.locations.filter((_, itemIndex) => itemIndex !== index)),
        stays: sortBySortOrder(footprints.stays.filter((stay) => stay.locationId !== location.id)),
      });
    } else if (kind === 'stays') {
      if (!window.confirm(`确定删除停留记录“${footprints.stays[index].title}”吗？`)) return;
      setFootprints({
        ...footprints,
        stays: sortBySortOrder(footprints.stays.filter((_, itemIndex) => itemIndex !== index)),
      });
    } else {
      if (!window.confirm(`确定删除路线“${footprints.routes[index].from} → ${footprints.routes[index].to}”吗？`)) return;
      setFootprints({
        ...footprints,
        routes: sortBySortOrder(footprints.routes.filter((_, itemIndex) => itemIndex !== index)),
      });
    }
    setDirty(true);
  }

  const save = useCallback(async () => {
    if (!footprints) return;
    const validationError = getFootprintsValidationError(footprints);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setSaving(true);
    try {
      const saved = await saveAdminFootprints({
        ...footprints,
        locations: sortBySortOrder(footprints.locations),
        stays: sortBySortOrder(footprints.stays),
        routes: sortBySortOrder(footprints.routes),
      });
      setFootprints({
        ...saved,
        locations: sortBySortOrder(saved.locations),
        stays: sortBySortOrder(saved.stays),
        routes: sortBySortOrder(saved.routes),
      });
      setDirty(false);
      toast.success('足迹已保存');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : '保存足迹失败');
    } finally {
      setSaving(false);
    }
  }, [footprints]);

  useEffect(() => {
    if (!footprints) {
      onToolbarChange(null);
      return;
    }

    onToolbarChange(
      <div className="flex items-center gap-2">
        {dirty && <span className="mr-2 text-amber-600 text-sm">有未保存更改</span>}
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setEditor({
              kind: 'location',
              index: null,
              item: {
                ...emptyLocation(),
                sortOrder: getNextSortOrder(footprints.locations),
              },
            })
          }
        >
          <Icon icon="ri:add-line" className="mr-1 size-4" />
          地点
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setEditor({
              kind: 'stay',
              index: null,
              item: {
                ...emptyStay(footprints.locations[0]?.id),
                sortOrder: getNextSortOrder(footprints.stays),
              },
            })
          }
        >
          <Icon icon="ri:add-line" className="mr-1 size-4" />
          停留
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setEditor({
              kind: 'route',
              index: null,
              item: {
                ...emptyRoute(),
                sortOrder: getNextSortOrder(footprints.routes),
              },
            })
          }
        >
          <Icon icon="ri:add-line" className="mr-1 size-4" />
          路线
        </Button>
        <Button size="sm" onClick={save} disabled={saving || !dirty}>
          <Icon icon={saving ? 'ri:loader-4-line' : 'ri:save-line'} className={`mr-1 size-4 ${saving ? 'animate-spin' : ''}`} />
          {saving ? '保存中…' : '保存'}
        </Button>
      </div>,
    );
    return () => onToolbarChange(null);
  }, [dirty, footprints, onToolbarChange, save, saving]);

  if (loading) return <ManagerMessage>正在读取足迹…</ManagerMessage>;
  if (error) return <ManagerError message={error} onRetry={reload} />;
  if (!footprints) return null;

  return (
    <section className="space-y-8" aria-label="足迹管理">
      <ListSection title="地点" count={footprints.locations.length}>
        <ManagerTable
          items={footprints.locations}
          getKey={(item) => item.id}
          emptyMessage="暂无地点"
          columns={[
            { label: 'ID', render: (item) => <RecordId id={item.id} /> },
            {
              label: '排序',
              render: (item) => <span className="text-muted-foreground">{item.sortOrder}</span>,
            },
            {
              label: '图标',
              render: (item) => (
                <div className="flex items-center gap-2">
                  <IconPreview icon={item.icon} />
                  {item.icon && <code className="text-muted-foreground">{item.icon}</code>}
                </div>
              ),
            },
            {
              label: '地点',
              render: (item) => (
                <>
                  <span className="font-medium">{item.name}</span>
                  <span className="mt-1 block text-muted-foreground">{item.type || '未设置类型'}</span>
                </>
              ),
            },
            {
              label: '坐标',
              render: (item) => (
                <span className="text-muted-foreground">
                  {item.lat}, {item.lng}
                </span>
              ),
            },
          ]}
          onEdit={(item, index) => setEditor({ kind: 'location', index, item: { ...item } })}
          onDelete={(_, index) => removeItem('locations', index)}
        />
      </ListSection>

      <ListSection title="停留记录" count={footprints.stays.length}>
        <ManagerTable
          items={footprints.stays}
          getKey={(item) => item.id}
          emptyMessage="暂无停留记录"
          columns={[
            { label: 'ID', render: (item) => <RecordId id={item.id} /> },
            {
              label: '排序',
              render: (item) => <span className="text-muted-foreground">{item.sortOrder}</span>,
            },
            {
              label: '标题 / 地点',
              render: (item) => (
                <>
                  <span className="font-medium">{item.title}</span>
                  <span className="mt-1 block text-muted-foreground">
                    {footprints.locations.find((location) => location.id === item.locationId)?.name || '地点不存在'}
                  </span>
                </>
              ),
            },
            {
              label: '时间',
              render: (item) => (
                <span className="text-muted-foreground">
                  {item.startDate} — {item.isPresent ? '至今' : item.endDate || '未填写'}
                </span>
              ),
            },
            {
              label: '类型',
              render: (item) => <span className="text-muted-foreground">{item.type || '—'}</span>,
            },
          ]}
          onEdit={(item, index) => setEditor({ kind: 'stay', index, item: { ...item } })}
          onDelete={(_, index) => removeItem('stays', index)}
        />
      </ListSection>

      <ListSection title="路线" count={footprints.routes.length}>
        <ManagerTable
          items={footprints.routes}
          getKey={(item) => item.id}
          emptyMessage="暂无路线"
          columns={[
            { label: 'ID', render: (item) => <RecordId id={item.id} /> },
            {
              label: '排序',
              render: (item) => <span className="text-muted-foreground">{item.sortOrder}</span>,
            },
            {
              label: '路线',
              render: (item) => (
                <>
                  <span className="font-medium">
                    {item.from} → {item.to}
                  </span>
                  <span className="mt-1 block text-muted-foreground">{item.label || '未填写标签'}</span>
                </>
              ),
            },
            {
              label: '日期',
              render: (item) => <span className="text-muted-foreground">{item.date || '—'}</span>,
            },
            {
              label: '交通 / 图片',
              render: (item) => (
                <span className="text-muted-foreground">
                  {item.transport || '未填写交通方式'} · {item.images.length} 张图片
                </span>
              ),
            },
          ]}
          onEdit={(item, index) =>
            setEditor({
              kind: 'route',
              index,
              item: { ...item, images: [...item.images] },
            })
          }
          onDelete={(_, index) => removeItem('routes', index)}
        />
      </ListSection>

      <Dialog open={editor !== null} onOpenChange={(open) => !open && setEditor(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editor
                ? `${editor.index === null ? '新增' : '编辑'}${editor.kind === 'location' ? '地点' : editor.kind === 'stay' ? '停留记录' : '路线'}`
                : ''}
            </DialogTitle>
            <DialogDescription>更改会先应用到列表，最后点击“保存全部更改”写入后端。</DialogDescription>
          </DialogHeader>
          {editor && <EditorFields editor={editor} locations={footprints.locations} onChange={setEditor} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditor(null)}>
              取消
            </Button>
            <Button onClick={applyEditor}>应用到列表</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function EditorFields({
  editor,
  locations,
  onChange,
}: {
  editor: FootprintEditor;
  locations: PublicLocation[];
  onChange: (editor: FootprintEditor) => void;
}) {
  if (editor.kind === 'location') {
    return (
      <div className="grid gap-4 py-2 sm:grid-cols-2">
        <Field
          label="名称"
          value={editor.item.name}
          onChange={(name) => onChange({ ...editor, item: { ...editor.item, name } })}
        />
        <Field
          label="类型"
          value={editor.item.type}
          onChange={(type) => onChange({ ...editor, item: { ...editor.item, type } })}
          placeholder="hometown / travel"
        />
        <NumberField
          label="纬度"
          value={editor.item.lat}
          onChange={(lat) => onChange({ ...editor, item: { ...editor.item, lat } })}
        />
        <NumberField
          label="经度"
          value={editor.item.lng}
          onChange={(lng) => onChange({ ...editor, item: { ...editor.item, lng } })}
        />
        <IconField
          label="地点图标"
          value={editor.item.icon}
          onChange={(icon) => onChange({ ...editor, item: { ...editor.item, icon } })}
          placeholder="ri:map-pin-line"
        />
        <NumberField
          label="排序值（越小越靠前）"
          value={editor.item.sortOrder}
          onChange={(sortOrder) => onChange({ ...editor, item: { ...editor.item, sortOrder } })}
          min={0}
          step={1}
        />
      </div>
    );
  }
  if (editor.kind === 'stay') {
    return (
      <div className="grid gap-4 py-2 sm:grid-cols-2">
        <Field
          label="标题"
          value={editor.item.title}
          onChange={(title) => onChange({ ...editor, item: { ...editor.item, title } })}
        />
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">所属地点</span>
          <select
            value={editor.item.locationId}
            onChange={(event) =>
              onChange({
                ...editor,
                item: { ...editor.item, locationId: event.target.value },
              })
            }
            className="w-full rounded-lg border border-input bg-background px-3 py-2"
          >
            <option value="">选择地点</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
        <Field
          label="类型"
          value={editor.item.type}
          onChange={(type) => onChange({ ...editor, item: { ...editor.item, type } })}
        />
        <NumberField
          label="排序值（越小越靠前）"
          value={editor.item.sortOrder}
          onChange={(sortOrder) => onChange({ ...editor, item: { ...editor.item, sortOrder } })}
          min={0}
          step={1}
        />
        <Field
          label="开始日期"
          value={editor.item.startDate}
          onChange={(startDate) => onChange({ ...editor, item: { ...editor.item, startDate } })}
          placeholder="2026.08"
        />
        <Field
          label="结束日期"
          value={editor.item.endDate}
          onChange={(endDate) => onChange({ ...editor, item: { ...editor.item, endDate } })}
          placeholder="2026.08"
          disabled={editor.item.isPresent}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={editor.item.isPresent}
            onChange={(event) =>
              onChange({
                ...editor,
                item: {
                  ...editor.item,
                  isPresent: event.target.checked,
                  endDate: event.target.checked ? '' : editor.item.endDate,
                },
              })
            }
          />
          目前仍在此停留
        </label>
        <TextArea
          label="描述"
          value={editor.item.description}
          onChange={(description) => onChange({ ...editor, item: { ...editor.item, description } })}
        />
      </div>
    );
  }
  return (
    <div className="grid gap-4 py-2 sm:grid-cols-2">
      <Field
        label="出发地"
        value={editor.item.from}
        onChange={(from) => onChange({ ...editor, item: { ...editor.item, from } })}
      />
      <Field label="目的地" value={editor.item.to} onChange={(to) => onChange({ ...editor, item: { ...editor.item, to } })} />
      <Field
        label="日期"
        value={editor.item.date}
        onChange={(date) => onChange({ ...editor, item: { ...editor.item, date } })}
        placeholder="2026.03.12"
      />
      <Field
        label="标签"
        value={editor.item.label}
        onChange={(label) => onChange({ ...editor, item: { ...editor.item, label } })}
      />
      <NumberField
        label="排序值（越小越靠前）"
        value={editor.item.sortOrder}
        onChange={(sortOrder) => onChange({ ...editor, item: { ...editor.item, sortOrder } })}
        min={0}
        step={1}
      />
      <Field
        label="交通方式"
        value={editor.item.transport}
        onChange={(transport) => onChange({ ...editor, item: { ...editor.item, transport } })}
      />
      <TextArea
        label="描述"
        value={editor.item.description}
        onChange={(description) => onChange({ ...editor, item: { ...editor.item, description } })}
      />
      <TextArea
        label="图片 URL（每行一条）"
        value={editor.item.images.join('\n')}
        onChange={(value) =>
          onChange({
            ...editor,
            item: {
              ...editor.item,
              images: value
                .split('\n')
                .map((url) => url.trim())
                .filter(Boolean),
            },
          })
        }
      />
    </div>
  );
}

function ListSection({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h4 className="font-semibold">
        {title} <span className="font-normal text-muted-foreground">({count})</span>
      </h4>
      {children}
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 disabled:opacity-50"
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  step = 'any',
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: number | 'any';
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full rounded-lg border border-input bg-background px-3 py-2"
      />
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block space-y-1.5 text-sm sm:col-span-2">
      <span className="font-medium">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
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
