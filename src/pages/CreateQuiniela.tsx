import { Link } from 'react-router-dom';

export function CreateQuiniela() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-100 p-4">
      <div className="max-w-md w-full bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-700/50">
        <h1 className="text-3xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300 text-center">
          Crear Quiniela
        </h1>
        <p className="text-slate-400 mb-10 text-center">
          Aquí irá el formulario para configurar tu nueva quiniela. Próximamente.
        </p>
        <Link 
          to="/home" 
          className="w-full block text-center py-3.5 px-4 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 text-white font-semibold rounded-xl transition-all"
        >
          Volver al Inicio
        </Link>
      </div>
    </div>
  );
}
