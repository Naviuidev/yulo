import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const OrdersChart = ({ labels = [], data = [] }) => {
  const chartData = {
    labels,
    datasets: [
      {
        label: 'Orders',
        data,
        borderColor: '#111',
        backgroundColor: 'rgba(17, 17, 17, 0.05)',
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#111',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, ticks: { stepSize: 1 } },
    },
  };

  return (
    <div className="yulo-chart-container">
      <Line data={chartData} options={options} />
    </div>
  );
};

export default OrdersChart;
