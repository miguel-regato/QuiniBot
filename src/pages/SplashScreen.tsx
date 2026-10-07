import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/home');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <img src="/logo.png" alt="Logo" className="w-48 md:w-64 mb-10 drop-shadow-2xl" />
      <div className="flex space-x-3">
        <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce shadow-[0_0_15px_rgba(59,130,246,0.6)]" style={{ animationDelay: '0s' }}></div>
        <div className="w-4 h-4 bg-cyan-400 rounded-full animate-bounce shadow-[0_0_15px_rgba(34,211,238,0.6)]" style={{ animationDelay: '0.15s' }}></div>
        <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce shadow-[0_0_15px_rgba(59,130,246,0.6)]" style={{ animationDelay: '0.3s' }}></div>
      </div>
    </div>
  );
}
