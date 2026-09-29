import type { EChartsOption } from 'echarts';
import { useEffect, useRef } from 'react';

export function EChartsCanvas({ option, label }: { option: EChartsOption; label: string }) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let chart: import('echarts/core').ECharts | undefined;
    let observer: ResizeObserver | undefined;

    async function renderChart() {
      const [core, charts, components, renderer] = await Promise.all([
        import('echarts/core'),
        import('echarts/charts'),
        import('echarts/components'),
        import('echarts/renderers'),
      ]);
      if (disposed || !elementRef.current) return;

      core.use([
        charts.BarChart,
        charts.LineChart,
        charts.PieChart,
        components.AriaComponent,
        components.GridComponent,
        components.LegendComponent,
        components.TooltipComponent,
        renderer.CanvasRenderer,
      ]);
      chart = core.init(elementRef.current, undefined, { renderer: 'canvas' });
      chart.setOption(option);
      observer = new ResizeObserver(() => chart?.resize());
      observer.observe(elementRef.current);
    }

    void renderChart();
    return () => {
      disposed = true;
      observer?.disconnect();
      chart?.dispose();
    };
  }, [option]);

  return <div ref={elementRef} className="admin-chart-canvas" role="img" aria-label={label} />;
}
