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
import { getTimelineValidationError } from '@/lib/admin/content-validation';
import { getNextSortOrder, sortBySortOrder } from '@/lib/admin/ordered-list';
import { getAdminTimeline, saveAdminTimeline, type TimelineContent } from '@/lib/admin/timeline';
import type { PublicInternship } from '@/lib/public-api/types';

interface TimelineEditorState {
  index: number | null;
  item: PublicInternship;
}

const emptyInternship = (): PublicInternship => ({
  id: crypto.randomUUID(),
  startDate: '',
  endDate: '',
  isPresent: false,
  company: '',
  icon: '',
  iconColor: '',
  position: '',
  description: '',
  sortOrder: 0,
});

export function TimelineManager({ onToolbarChange }: { onToolbarChange: (actions: ReactNode | null) => void }) {
  const [timeline, setTimeline] = useState<TimelineContent | null>(null);
  const [editor, setEditor] = useState<TimelineEditorState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAdminTimeline();
      setTimeline({ ...data, items: sortBySortOrder(data.items) });
      setDirty(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '读取实习经历失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  function applyEditor() {
    if (!timeline || !editor) return;
    const validationError = getTimelineValidationError({ version: timeline.version, items: [editor.item] });
    if (validationError) {
      toast.error(validationError);
      return;
    }
    const items =
      editor.index === null
        ? [...timeline.items, editor.item]
        : timeline.items.map((item, index) => (index === editor.index ? editor.item : item));
    if (!Number.isInteger(editor.item.sortOrder) || editor.item.sortOrder < 0) {
      toast.error('排序值必须是大于等于 0 的整数。');
      return;
    }
    setTimeline({ ...timeline, items: sortBySortOrder(items) });
    setDirty(true);
    setEditor(null);
  }

  function removeItem(item: PublicInternship) {
    if (!timeline || !window.confirm(`确定删除“${item.company || '这段经历'}”吗？`)) return;
    setTimeline({ ...timeline, items: sortBySortOrder(timeline.items.filter((entry) => entry.id !== item.id)) });
    setDirty(true);
  }

  const save = useCallback(async () => {
    if (!timeline) return;
    const validationError = getTimelineValidationError(timeline);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setSaving(true);
    try {
      const saved = await saveAdminTimeline({ ...timeline, items: sortBySortOrder(timeline.items) });
      setTimeline({ ...saved, items: sortBySortOrder(saved.items) });
      setDirty(false);
      toast.success('实习经历已保存');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : '保存实习经历失败');
    } finally {
      setSaving(false);
    }
  }, [timeline]);

  useEffect(() => {
    if (!timeline) {
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
            setEditor({ index: null, item: { ...emptyInternship(), sortOrder: getNextSortOrder(timeline.items) } })
          }
        >
          <Icon icon="ri:add-line" className="mr-1.5 size-4" />
          新增经历
        </Button>
        <Button size="sm" onClick={save} disabled={saving || !dirty}>
          <Icon
            icon={saving ? 'ri:loader-4-line' : 'ri:save-line'}
            className={`mr-1.5 size-4 ${saving ? 'animate-spin' : ''}`}
          />
          {saving ? '保存中…' : '保存更改'}
        </Button>
      </div>,
    );
    return () => onToolbarChange(null);
  }, [dirty, onToolbarChange, save, saving, timeline]);

  if (loading) return <ManagerMessage>正在读取实习经历…</ManagerMessage>;
  if (error) return <ManagerError message={error} onRetry={reload} />;
  if (!timeline) return null;

  return (
    <section className="space-y-5" aria-label="实习经历管理">
      <ManagerTable
        items={timeline.items}
        getKey={(item) => item.id}
        emptyMessage="暂无实习经历"
        columns={[
          { label: 'ID', render: (item) => <RecordId id={item.id} /> },
          { label: '排序', render: (item) => <span className="text-muted-foreground">{item.sortOrder}</span> },
          {
            label: '图标',
            render: (item) => (
              <div className="flex items-center gap-2">
                <IconPreview icon={item.icon} color={item.iconColor} />
                {item.icon && <code className="text-muted-foreground">{item.icon}</code>}
              </div>
            ),
          },
          {
            label: '公司 / 职位',
            render: (item) => (
              <span className="min-w-0">
                <span className="block font-medium">{item.company}</span>
                <span className="mt-1 block text-muted-foreground">{item.position || '未填写职位'}</span>
              </span>
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
            label: '描述',
            render: (item) => <span className="line-clamp-1 text-muted-foreground">{item.description || '—'}</span>,
          },
        ]}
        onEdit={(item, index) => setEditor({ index, item: { ...item } })}
        onDelete={removeItem}
      />

      <Dialog open={editor !== null} onOpenChange={(open) => !open && setEditor(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editor?.index === null ? '新增实习经历' : '编辑实习经历'}</DialogTitle>
            <DialogDescription>填写时间线中展示的公司、职位和经历信息。</DialogDescription>
          </DialogHeader>
          {editor && (
            <div className="grid gap-4 py-2 sm:grid-cols-2">
              <Field
                label="公司"
                value={editor.item.company}
                onChange={(company) => setEditor({ ...editor, item: { ...editor.item, company } })}
              />
              <Field
                label="职位"
                value={editor.item.position}
                onChange={(position) => setEditor({ ...editor, item: { ...editor.item, position } })}
              />
              <Field
                label="开始日期"
                value={editor.item.startDate}
                onChange={(startDate) => setEditor({ ...editor, item: { ...editor.item, startDate } })}
                placeholder="2026.08"
              />
              <Field
                label="结束日期"
                value={editor.item.endDate}
                onChange={(endDate) => setEditor({ ...editor, item: { ...editor.item, endDate } })}
                placeholder="2026.08"
                disabled={editor.item.isPresent}
              />
              <NumberField
                label="排序值（越小越靠前）"
                value={editor.item.sortOrder}
                onChange={(sortOrder) => setEditor({ ...editor, item: { ...editor.item, sortOrder } })}
              />
              <IconField
                label="公司图标"
                value={editor.item.icon}
                onChange={(icon) => setEditor({ ...editor, item: { ...editor.item, icon } })}
                placeholder="ri:building-line"
                color={editor.item.iconColor}
              />
              <Field
                label="图标颜色"
                value={editor.item.iconColor}
                onChange={(iconColor) => setEditor({ ...editor, item: { ...editor.item, iconColor } })}
                placeholder="#d95778"
              />
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  checked={editor.item.isPresent}
                  onChange={(event) =>
                    setEditor({
                      ...editor,
                      item: {
                        ...editor.item,
                        isPresent: event.target.checked,
                        endDate: event.target.checked ? '' : editor.item.endDate,
                      },
                    })
                  }
                />
                目前仍在职
              </label>
              <TextArea
                label="经历描述"
                value={editor.item.description}
                onChange={(description) => setEditor({ ...editor, item: { ...editor.item, description } })}
              />
            </div>
          )}
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

function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block space-y-1.5 text-sm sm:col-span-2">
      <span className="font-medium">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="w-full rounded-lg border border-input bg-background px-3 py-2"
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
        min={0}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
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
