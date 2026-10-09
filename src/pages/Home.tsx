import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { obtenerUltimasJornadas } from '../lib/apiLoterias';
import { getJornadas, saveJornada } from '../lib/db';interface Jornada {
  id: string;
  numero: number;
  estado: 'NO_COMENZADA' | 'EN_PROGRESO' | 'TERMINADA';
  quinielaSubida: boolean;
}

const getCardStyles = (estado: Jornada['estado']) => {
  switch (estado) {
    case 'TERMINADA':
      return 'bg-emerald-900/30 border border-emerald-700/50 hover:bg-emerald-900/50 hover:border-emerald-500/50 shadow-[0_4px_20px_rgba(6,78,59,0.15)]';
    case 'EN_PROGRESO':
      return 'bg-amber-900/30 border border-amber-700/50 hover:bg-amber-900/50 hover:border-amber-500/50 shadow-[0_4px_20px_rgba(120,53,15,0.15)]';
    case 'NO_COMENZADA':
    default:
      return 'bg-slate-800 border border-slate-700/50 hover:bg-slate-700 shadow-xl';
  }
};

export function Home() {
  const navigate = useNavigate();
  const [jornadas, setJornadas] = useState<Jornada[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const jornadasDB = await getJornadas();
        const jornadasAPI = await obtenerUltimasJornadas();
        const fusionadas: any[] = [];

        for (const jornadaAPI of jornadasAPI) {
          const dbData = jornadasDB.find(j => j.id === jornadaAPI.id);

          if (!dbData) {
            jornadaAPI.quinielaSubida = false;
            await saveJornada(jornadaAPI);
            fusionadas.push(jornadaAPI);
          } else {
            const jornadaActualizada = { ...dbData, estado: jornadaAPI.estado, partidos: jornadaAPI.partidos };
            await saveJornada(jornadaActualizada);
            fusionadas.push(jornadaActualizada);
          }
        }

        for (const db of jornadasDB) {
          if (!fusionadas.find(j => j.id === db.id)) {
            fusionadas.push(db);
          }
        }

        fusionadas.sort((a, b) => b.numero - a.numero);

        const jornadasParaEstado = fusionadas.map(j => ({
          id: j.id,
          numero: j.numero,
          estado: j.estado as 'NO_COMENZADA' | 'EN_PROGRESO' | 'TERMINADA',
          quinielaSubida: j.quinielaSubida
        }));

        setJornadas(jornadasParaEstado);
      } catch (error) {
        console.error('Error al sincronizar jornadas:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-12 font-sans selection:bg-cyan-500/30">
      <div className="max-w-2xl mx-auto">
        <header className="mb-10 mt-4">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
            Jornadas
          </h1>
          <p className="text-slate-400 text-lg font-medium">
            Selecciona una jornada para gestionar tu quiniela.
          </p>
        </header>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-xl font-semibold text-cyan-400 animate-pulse tracking-wide">
              Sincronizando con Loterías...
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {jornadas.map((jornada) => (
              <button
                key={jornada.id}
                onClick={() => navigate(`/jornada/${jornada.id}`)}
                className={`w-full flex items-center justify-between p-6 md:p-8 rounded-3xl transition-all duration-300 transform hover:scale-[1.02] ${getCardStyles(jornada.estado)}`}
              >
                <div className="flex flex-col items-start">
                  <span className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-1">
                    Jornada {jornada.numero}
                  </span>
                  <span className={`text-xs font-bold uppercase tracking-wider ${
                    jornada.estado === 'TERMINADA' ? 'text-emerald-400/80' : 
                    jornada.estado === 'EN_PROGRESO' ? 'text-amber-400/80' : 
                    'text-slate-400'
                  }`}>
                    {jornada.estado.replace('_', ' ')}
                  </span>
                </div>
                
                <div className="flex items-center space-x-2.5 bg-slate-950/40 px-4 py-2.5 rounded-2xl backdrop-blur-md border border-white/5 shadow-inner">
                  {jornada.quinielaSubida ? (
                    <>
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.9)] animate-pulse"></div>
                      <span className="text-emerald-400 font-bold text-sm tracking-wide">Jugada</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.9)]"></div>
                      <span className="text-rose-400 font-bold text-sm tracking-wide">No jugada</span>
                    </>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
