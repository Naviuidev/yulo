import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const WaveChart = ({
  labels = [],
  datasets = [],
  currency = false,
}) => {
  const chartData = {
    labels,
    datasets: datasets.map((ds) => ({
      label: ds.label,
      data: ds.data,
      borderColor: ds.borderColor || '#111111',
      backgroundColor: ds.backgroundColor || 'rgba(17, 17, 17, 0.10)',
      fill: true,
      tension: 0.45,
      borderWidth: 2.5,
      pointRadius: 0,
      pointHoverRadius: 5,
      pointBackgroundColor: ds.borderColor || '#111111',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: datasets.length > 1,
        position: 'top',
        align: 'end',
        labels: { boxWidth: 10, usePointStyle: true, pointStyle: 'circle' },
      },
      tooltip: {
        backgroundColor: '#111',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
        cornerRadius: 8,
        callbacks: currency
          ? {
              label: (ctx) => {
                const value = Number(ctx.parsed.y || 0);
                return `${ctx.dataset.label}: ₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
              },
            }
          : undefined,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#888', maxRotation: 0, autoSkip: true, maxTicksLimit: 12 },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        grid: { color: '#f0f0f0' },
        ticks: {
          color: '#888',
          callback: currency
            ? (v) => `₹${Number(v).toLocaleString('en-IN')}`
            : undefined,
        },
        border: { display: false },
      },
    },
  };

  return (
    <div className="yulo-chart-container yulo-wave-chart">
      <Line data={chartData} options={options} />
    </div>
  );
};

export default WaveChart;
