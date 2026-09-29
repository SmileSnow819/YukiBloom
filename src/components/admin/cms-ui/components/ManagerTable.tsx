import { Icon } from '@iconify/react';
import type { ReactNode } from 'react';

function ManagerAction({
  icon,
  label,
  title,
  onClick,
  destructive = false,
}: {
  icon: string;
  label: string;
  title: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`flex min-w-12 cursor-pointer flex-col items-center gap-1 rounded-md px-1.5 py-1.5 text-[10px] leading-none transition-colors hover:bg-accent hover:text-foreground ${destructive ? 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive' : 'text-muted-foreground'}`}
    >
      <Icon icon={icon} className="size-4" />
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

export interface ManagerTableColumn<T> {
  label: string;
  render: (item: T, index: number) => ReactNode;
}

export function ManagerTable<T>({
  items,
  columns,
  getKey,
  emptyMessage,
  onEdit,
  onDelete,
}: {
  items: T[];
  columns: ManagerTableColumn<T>[];
  getKey: (item: T, index: number) => string;
  emptyMessage: string;
  onEdit?: (item: T, index: number) => void;
  onDelete?: (item: T, index: number) => void;
}) {
  const hasActions = Boolean(onEdit || onDelete);

  if (items.length === 0) {
    return <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">{emptyMessage}</div>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="border-border border-b bg-muted/50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.label}
                  className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide"
                >
                  {column.label}
                </th>
              ))}
              {hasActions && (
                <th className="px-4 py-3 text-right font-medium text-muted-foreground text-xs uppercase tracking-wide">操作</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item, index) => (
              <tr key={getKey(item, index)} className="transition-colors hover:bg-muted/30">
                {columns.map((column) => (
                  <td key={column.label} className="px-4 py-3 text-sm">
                    {column.render(item, index)}
                  </td>
                ))}
                {hasActions && (
                  <td className="whitespace-nowrap px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      {onEdit && (
                        <ManagerAction icon="ri:edit-line" label="编辑" title="编辑" onClick={() => onEdit(item, index)} />
                      )}
                      {onDelete && (
                        <ManagerAction
                          icon="ri:delete-bin-line"
                          label="删除"
                          title="删除"
                          destructive
                          onClick={() => onDelete(item, index)}
                        />
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
