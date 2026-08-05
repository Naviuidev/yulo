import { useEffect, useState } from 'react';

function getTimeLeft(endDate) {
  const diff = new Date(endDate) - new Date();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export default function CountdownTimer({ endDate }) {
  const [time, setTime] = useState(() => getTimeLeft(endDate));

  useEffect(() => {
    const timer = setInterval(() => setTime(getTimeLeft(endDate)), 1000);
    return () => clearInterval(timer);
  }, [endDate]);

  const units = [
    { label: 'Days', value: time.days },
    { label: 'Hours', value: time.hours },
    { label: 'Mins', value: time.minutes },
    { label: 'Secs', value: time.seconds },
  ];

  return (
    <div className="countdown-timer">
      {units.map((u) => (
        <div key={u.label} className="countdown-unit">
          <span>{String(u.value).padStart(2, '0')}</span>
          <small>{u.label}</small>
        </div>
      ))}
    </div>
  );
}
