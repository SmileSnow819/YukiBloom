import { Icon } from '@iconify/react';
import { type ReactNode, useState } from 'react';

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
  onReorder,
  reorderDisabled = false,
}: {
  items: T[];
  columns: ManagerTableColumn<T>[];
  getKey: (item: T, index: number) => string;
  emptyMessage: string;
  onEdit?: (item: T, index: number) => void;
  onDelete?: (item: T, index: number) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  reorderDisabled?: boolean;
}) {
  const hasActions = Boolean(onEdit || onDelete);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  if (items.length === 0) {
    return <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">{emptyMessage}</div>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead className="border-border border-b bg-muted/50">
            <tr>
              {onReorder && <th className="w-32 px-3 py-3 text-left font-medium text-muted-foreground text-xs">顺序</th>}
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
              <tr
                key={getKey(item, index)}
                onDragOver={
                  onReorder && !reorderDisabled
                    ? (event) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = 'move';
                        setDropIndex(index);
                      }
                    : undefined
                }
                onDrop={
                  onReorder && !reorderDisabled
                    ? (event) => {
                        event.preventDefault();
                        const draggedItem = event.dataTransfer.getData('application/x-manager-index');
                        const fromIndex = Number(draggedItem);
                        if (draggedItem !== '' && Number.isInteger(fromIndex) && fromIndex >= 0 && fromIndex < items.length) {
                          onReorder(fromIndex, index);
                        }
                        setDraggedIndex(null);
                        setDropIndex(null);
                      }
                    : undefined
                }
                onDragLeave={(event) => {
                  if (event.currentTarget === event.target) setDropIndex(null);
                }}
                className={`transition-colors hover:bg-muted/30 ${draggedIndex === index ? 'opacity-40' : ''} ${dropIndex === index && draggedIndex !== index ? 'border-primary border-t-2' : ''}`}
              >
                {onReorder && (
                  <td className="whitespace-nowrap px-3 py-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        draggable={!reorderDisabled}
                        disabled={reorderDisabled}
                        aria-label={`拖动调整到第 ${index + 1} 位`}
                        title="拖动调整顺序"
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = 'move';
                          event.dataTransfer.setData('application/x-manager-index', String(index));
                          setDraggedIndex(index);
                        }}
                        onDragEnd={() => {
                          setDraggedIndex(null);
                          setDropIndex(null);
                        }}
                        className="cursor-grab rounded p-1 text-muted-foreground hover:bg-accent active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Icon icon="ri:drag-move-2-line" className="size-4" />
                      </button>
                      <span className="w-5 text-center text-muted-foreground text-xs">{index + 1}</span>
                      <button
                        type="button"
                        disabled={reorderDisabled || index === 0}
                        aria-label={`上移到第 ${index} 位`}
                        title="上移"
                        onClick={() => onReorder(index, index - 1)}
                        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
                      >
                        <Icon icon="ri:arrow-up-line" className="size-4" />
                      </button>
                      <button
                        type="button"
                        disabled={reorderDisabled || index === items.length - 1}
                        aria-label={`下移到第 ${index + 2} 位`}
                        title="下移"
                        onClick={() => onReorder(index, index + 1)}
                        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
                      >
                        <Icon icon="ri:arrow-down-line" className="size-4" />
                      </button>
                    </div>
                  </td>
                )}
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
