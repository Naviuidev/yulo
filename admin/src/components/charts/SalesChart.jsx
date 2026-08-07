import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#111',
      titleColor: '#fff',
      bodyColor: '#fff',
      padding: 12,
      cornerRadius: 8,
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#888' } },
    y: { grid: { color: '#f0f0f0' }, ticks: { color: '#888' } },
  },
};

const SalesChart = ({ labels = [], data = [], label = 'Sales' }) => {
  const chartData = {
    labels,
    datasets: [
      {
        label,
        data,
        borderColor: '#111111',
        backgroundColor: 'rgba(17, 17, 17, 0.08)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#111111',
        pointBorderColor: '#fff',
        pointRadius: 4,
      },
    ],
  };

  return (
    <div className="yulo-chart-container">
      <Line data={chartData} options={chartOptions} />
    </div>
  );
};

export default SalesChart;
