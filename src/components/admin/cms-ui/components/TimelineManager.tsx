import { Button } from '@admin-ui/components/ui/button';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { getTimelineValidationError } from '@/lib/admin/content-validation';
import { moveItem, withSortOrder } from '@/lib/admin/ordered-list';
import { getAdminTimeline, saveAdminTimeline, type TimelineContent } from '@/lib/admin/timeline';
import type { PublicInternship } from '@/lib/public-api/types';

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

export function TimelineManager() {
  const [timeline, setTimeline] = useState<TimelineContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setTimeline(await getAdminTimeline());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '读取实习经历失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  function updateItem(index: number, changes: Partial<PublicInternship>) {
    setTimeline((current) =>
      current
        ? { ...current, items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...changes } : item)) }
        : current,
    );
  }

  function move(index: number, offset: number) {
    setTimeline((current) =>
      current ? { ...current, items: withSortOrder(moveItem(current.items, index, index + offset)) } : current,
    );
  }

  async function save() {
    if (!timeline) return;
    const validationError = getTimelineValidationError(timeline);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setSaving(true);
    try {
      setTimeline(await saveAdminTimeline({ ...timeline, items: withSortOrder(timeline.items) }));
      toast.success('实习经历已保存');
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : '保存实习经历失败');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <ManagerMessage>正在读取实习经历…</ManagerMessage>;
  if (error) return <ManagerError message={error} onRetry={reload} />;
  if (!timeline) return null;

  return (
    <section className="space-y-5" aria-label="实习经历管理">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-lg">实习经历</h3>
          <p className="text-muted-foreground text-sm">调整侧栏时间线展示的实习条目和顺序。</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTimeline({ ...timeline, items: [...timeline.items, emptyInternship()] })}>
            新增经历
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? '保存中…' : '保存更改'}
          </Button>
        </div>
      </div>

      {timeline.items.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">暂无实习经历</div>
      )}
      <div className="space-y-4">
        {timeline.items.map((item, index) => (
          <article key={item.id} className="space-y-4 rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h4 className="font-medium">
                经历 {index + 1}
                {item.company ? ` · ${item.company}` : ''}
              </h4>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  aria-label="上移经历"
                >
                  上移
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={index === timeline.items.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label="下移经历"
                >
                  下移
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    setTimeline({
                      ...timeline,
                      items: timeline.items.filter((_, i) => i !== index).map((entry, sortOrder) => ({ ...entry, sortOrder })),
                    })
                  }
                >
                  删除
                </Button>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field label="公司" value={item.company} onChange={(company) => updateItem(index, { company })} required />
              <Field label="职位" value={item.position} onChange={(position) => updateItem(index, { position })} />
              <Field
                label="图标"
                value={item.icon}
                onChange={(icon) => updateItem(index, { icon })}
                placeholder="ri:building-line"
              />
              <Field
                label="图标颜色"
                value={item.iconColor}
                onChange={(iconColor) => updateItem(index, { iconColor })}
                placeholder="#d95778"
              />
              <Field
                label="开始日期"
                value={item.startDate}
                onChange={(startDate) => updateItem(index, { startDate })}
                placeholder="2026.08"
                required
              />
              <Field
                label="结束日期"
                value={item.endDate}
                onChange={(endDate) => updateItem(index, { endDate })}
                placeholder="2026.08"
                disabled={item.isPresent}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={item.isPresent}
                onChange={(event) =>
                  updateItem(index, { isPresent: event.target.checked, endDate: event.target.checked ? '' : item.endDate })
                }
              />
              目前仍在职
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium">经历描述</span>
              <textarea
                value={item.description}
                onChange={(event) => updateItem(index, { description: event.target.value })}
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-3 py-2"
              />
            </label>
          </article>
        ))}
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      <input
        type={type}
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
