import './timeline.css';

export interface TimelineItem {
  startDate: string;
  endDate?: string;
  company: string;
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
      {items.map((item) => (
        <div key={`${item.company}-${item.startDate}`} className="timeline-item">
          <div className="timeline-dot" />
          <div className="timeline-line" />
          <div className="timeline-content">
            <div className="timeline-period">
              {formatDate(item.startDate)} - {item.isPresent ? '至今' : formatDate(item.endDate || '')}
            </div>
            <h3 className="timeline-company">{item.company}</h3>
            <div className="timeline-position">{item.position}</div>
            {item.description && <p className="timeline-description">{item.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
