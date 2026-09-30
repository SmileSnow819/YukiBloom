import { DeleteConfirmDialog } from '@admin-ui/components/DeleteConfirmDialog';
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
import * as Popover from '@radix-ui/react-popover';
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
  const [pendingDelete, setPendingDelete] = useState<{ description: string; onConfirm: () => void } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAdminTimeline();
      setTimeline({ ...data, items: sortBySortOrder(data.items) });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '读取实习经历失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function applyEditor() {
    if (!timeline || !editor || saving) return;
    const item = {
      ...editor.item,
      startDate: normalizeMonthDate(editor.item.startDate),
      endDate: normalizeMonthDate(editor.item.endDate),
    };
    const validationError = getTimelineValidationError({ version: timeline.version, items: [item] });
    if (validationError) {
      toast.error(validationError);
      return;
    }
    const items =
      editor.index === null
        ? [...timeline.items, item]
        : timeline.items.map((entry, index) => (index === editor.index ? item : entry));
    if (!Number.isInteger(item.sortOrder) || item.sortOrder < 0) {
      toast.error('排序值必须是大于等于 0 的整数。');
      return;
    }
    setSaving(true);
    try {
      const { data: saved, message } = await saveAdminTimeline({ ...timeline, items: sortBySortOrder(items) });
      setTimeline({ ...saved, items: sortBySortOrder(saved.items) });
      setEditor(null);
      toast.success(message || (editor.index === null ? '实习经历已创建' : '实习经历已更新'));
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : '保存实习经历失败');
    } finally {
      setSaving(false);
    }
  }

  async function removeItem(item: PublicInternship) {
    if (!timeline || saving) return;
    const nextTimeline = {
      ...timeline,
      items: sortBySortOrder(timeline.items.filter((entry) => entry.id !== item.id)),
    };
    setSaving(true);
    try {
      const { data: saved, message } = await saveAdminTimeline(nextTimeline);
      setTimeline({ ...saved, items: sortBySortOrder(saved.items) });
      toast.success(message || '实习经历已删除');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : '删除实习经历失败');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!timeline) {
      onToolbarChange(null);
      return;
    }

    onToolbarChange(
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={saving}
          onClick={() =>
            setEditor({ index: null, item: { ...emptyInternship(), sortOrder: getNextSortOrder(timeline.items) } })
          }
        >
          <Icon icon="ri:add-line" className="mr-1.5 size-4" />
          新增经历
        </Button>
      </div>,
    );
    return () => onToolbarChange(null);
  }, [onToolbarChange, saving, timeline]);

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
        onDelete={(item) =>
          setPendingDelete({
            description: `确定删除“${item.company || '这段经历'}”吗？`,
            onConfirm: () => void removeItem(item),
          })
        }
      />

      <DeleteConfirmDialog
        open={pendingDelete !== null}
        title="确认删除实习经历？"
        description={pendingDelete?.description ?? ''}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        onConfirm={() => {
          pendingDelete?.onConfirm();
          setPendingDelete(null);
        }}
      />

      <Dialog open={editor !== null} onOpenChange={(open) => !open && !saving && setEditor(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editor?.index === null ? '新增实习经历' : '编辑实习经历'}</DialogTitle>
            <DialogDescription>填写时间线中展示的公司、职位和经历信息。</DialogDescription>
          </DialogHeader>
          {editor && (
            <fieldset disabled={saving} className="contents">
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
                <MonthField
                  label="开始日期"
                  value={editor.item.startDate}
                  onChange={(startDate) => setEditor({ ...editor, item: { ...editor.item, startDate } })}
                />
                <MonthField
                  label="结束日期"
                  value={editor.item.endDate}
                  onChange={(endDate) => setEditor({ ...editor, item: { ...editor.item, endDate, isPresent: false } })}
                  current={editor.item.isPresent}
                  onSelectCurrent={() =>
                    setEditor({
                      ...editor,
                      item: {
                        ...editor.item,
                        isPresent: true,
                        endDate: '',
                      },
                    })
                  }
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
                <ColorField
                  label="图标颜色"
                  value={editor.item.iconColor}
                  onChange={(iconColor) => setEditor({ ...editor, item: { ...editor.item, iconColor } })}
                />
                <TextArea
                  label="经历描述"
                  value={editor.item.description}
                  onChange={(description) => setEditor({ ...editor, item: { ...editor.item, description } })}
                />
              </div>
            </fieldset>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditor(null)} disabled={saving}>
              取消
            </Button>
            <Button onClick={() => void applyEditor()} disabled={saving}>
              {saving ? '保存中…' : editor?.index === null ? '保存并创建' : '保存修改'}
            </Button>
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

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const pickerValue = /^#[\da-f]{6}$/i.test(value) ? value : '#d95778';

  return (
    <div className="space-y-1.5 text-sm">
      <span className="block font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <div className="relative size-10 shrink-0 overflow-hidden rounded-lg border border-input shadow-sm">
          <input
            type="color"
            value={pickerValue}
            onChange={(event) => onChange(event.target.value)}
            aria-label={`${label}颜色选择器`}
            className="absolute -top-1/2 -left-1/2 h-[200%] w-[200%] cursor-pointer p-0"
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-label={`${label} HEX 值`}
          placeholder="留空使用默认颜色"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm"
        />
      </div>
    </div>
  );
}

function MonthField({
  label,
  value,
  onChange,
  disabled,
  current,
  onSelectCurrent,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  current?: boolean;
  onSelectCurrent?: () => void;
}) {
  const selectedMonth = toMonthInputValue(value);
  const selectedYear = selectedMonth ? Number(selectedMonth.slice(0, 4)) : new Date().getFullYear();
  const [displayYear, setDisplayYear] = useState(selectedYear);
  const [open, setOpen] = useState(false);

  useEffect(() => setDisplayYear(selectedYear), [selectedYear]);

  return (
    <div className="block space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <Button type="button" variant="outline" disabled={disabled} className="w-full justify-between font-normal">
            <span className={selectedMonth || current ? '' : 'text-muted-foreground'}>
              {current
                ? '至今'
                : selectedMonth
                  ? `${selectedMonth.slice(0, 4)} 年 ${Number(selectedMonth.slice(5))} 月`
                  : '选择年月'}
            </span>
            <Icon icon="ri:calendar-line" className="size-4 text-muted-foreground" aria-hidden="true" />
          </Button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            side="bottom"
            align="start"
            sideOffset={4}
            className="z-[60] w-72 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-lg outline-none"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="上一年"
                  onClick={() => setDisplayYear((year) => year - 1)}
                >
                  <Icon icon="ri:arrow-left-s-line" className="size-5" />
                </Button>
                <span className="font-medium tabular-nums">{displayYear} 年</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="下一年"
                  onClick={() => setDisplayYear((year) => year + 1)}
                >
                  <Icon icon="ri:arrow-right-s-line" className="size-5" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 12 }, (_, index) => {
                  const month = String(index + 1).padStart(2, '0');
                  const monthValue = `${displayYear}-${month}`;
                  const isSelected = selectedMonth === monthValue;

                  return (
                    <Button
                      key={month}
                      type="button"
                      variant={isSelected ? 'default' : 'ghost'}
                      className="h-9 px-2"
                      onClick={() => {
                        onChange(`${displayYear}.${month}`);
                        setOpen(false);
                      }}
                    >
                      {index + 1} 月
                    </Button>
                  );
                })}
              </div>
              {onSelectCurrent && (
                <Button
                  type="button"
                  variant={current ? 'secondary' : 'outline'}
                  aria-pressed={current}
                  className="w-full"
                  onClick={() => {
                    onSelectCurrent();
                    setOpen(false);
                  }}
                >
                  至今
                </Button>
              )}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}

function toMonthInputValue(value: string): string {
  const match = /^(\d{4})\.(\d{2})(?:\.\d{2})?$/.exec(value);
  return match ? `${match[1]}-${match[2]}` : '';
}

function normalizeMonthDate(value: string): string {
  const match = /^(\d{4})\.(\d{2})(?:\.\d{2})?$/.exec(value);
  return match ? `${match[1]}.${match[2]}` : value;
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
