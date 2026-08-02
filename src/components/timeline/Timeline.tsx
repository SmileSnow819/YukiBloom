import './timeline.css';
import { Icon } from '@iconify/react';
import type { CSSProperties } from 'react';

type TimelineIconStyle = CSSProperties & {
  '--timeline-icon-color'?: string;
};

export interface TimelineItem {
  startDate: string;
  endDate?: string;
  company: string;
  icon?: string;
  iconColor?: string;
  position: string;
  description?: string;
  isPresent?: boolean;
}

interface TimelineProps {
  items: TimelineItem[];
}

function formatDate(dateStr: string): string {
  return dateStr;
}

export default function Timeline({ items }: TimelineProps) {
  return (
    <div className="timeline-container">
      {items.map((item) => {
        const iconStyle: TimelineIconStyle | undefined = item.iconColor
          ? { '--timeline-icon-color': item.iconColor }
          : undefined;

        return (
          <div key={`${item.company}-${item.startDate}`} className="timeline-item">
            <div className="timeline-dot" />
            <div className="timeline-line" />
            <div className="timeline-content">
              <div className="timeline-period">
                {formatDate(item.startDate)} - {item.isPresent ? '至今' : formatDate(item.endDate || '')}
              </div>
              <div className="timeline-company">
                {item.icon && <Icon icon={item.icon} className="timeline-company-icon" style={iconStyle} aria-hidden="true" />}
                <span>{item.company}</span>
              </div>
              <div className="timeline-position">{item.position}</div>
              {item.description && <p className="timeline-description">{item.description}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
