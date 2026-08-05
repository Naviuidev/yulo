import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const RevenueChart = ({ labels = [], data = [] }) => {
  const chartData = {
    labels,
    datasets: [
      {
        label: 'Revenue',
        data,
        backgroundColor: 'rgba(149, 101, 20, 0.85)',
        borderColor: '#7a520f',
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: '#111', titleColor: '#fff' },
    },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: '#f0f0f0' } },
    },
  };

  return (
    <div className="yulo-chart-container">
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default RevenueChart;
