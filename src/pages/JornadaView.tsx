import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Camera } from 'lucide-react';
import { getJornadaById } from '../lib/db';
import { obtenerUltimasJornadas } from '../lib/apiLoterias';

// 1. ESTRUCTURA DE DATOS
export interface Partido {
  numero: number | string;
  local: string;
  visitante: string;
  genero: 'm' | 'f';
  golesLocal?: number;
  golesVisitante?: number;
  resultado1X2?: string;
  plenoGoles?: string;
  fecha: string;
  hora: string;
  estado: 'NO_EMPEZADO' | 'EN_JUEGO' | 'FINALIZADO';
}

export interface ColumnaJugador {
  nombre: string;
  pronosticos: string[];
  pleno15?: string;
  elige8Partidos?: number[];
}

export interface DetalleJornada {
  id: string;
  numero: number;
  estado: string;
  quinielaSubida: boolean;
  partidos: Partido[];
  columnas: ColumnaJugador[];
}

export function JornadaView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [jornada, setJornada] = useState<DetalleJornada | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAdmin = localStorage.getItem('quinibot_admin') === 'true';

  useEffect(() => {
    async function loadJornada() {
      if (!id) return;
      try {
        const dataDB = await getJornadaById(id);
        if (dataDB) {
          setJornada(dataDB);
        } else {
          const nuevaJornadas = await obtenerUltimasJornadas();
          const jornadaEncontrada = nuevaJornadas.find(j => j.id === id);
          if (jornadaEncontrada) {
            setJornada(jornadaEncontrada);
          }
        }
      } catch (error) {
        console.error("Error al cargar la jornada", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadJornada();
  }, [id]);

  const handleEdit = () => {
    alert("Función para editar datos de la jornada.");
  };

  const handleCaptura = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && jornada) {
      navigate(`/jornada/${jornada.id}/validar`, { state: { imageFile: file, jornadaOriginal: jornada } });
    }
  };



  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mr-3"></div>
        <span className="text-xl text-cyan-400 font-semibold animate-pulse">Cargando jornada...</span>
      </div>
    );
  }

  if (!jornada) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4">
        <h2 className="text-3xl font-bold mb-4 text-rose-500">Jornada no encontrada</h2>
        <Link to="/" className="text-blue-400 hover:underline">Volver a inicio</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans selection:bg-cyan-500/30">
      <div className="max-w-6xl mx-auto">

        {/* CABECERA */}
        <div className="flex items-center justify-between mb-8 relative">
          <Link to="/home" className="p-2.5 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors shadow-md">
            <ArrowLeft className="w-6 h-6 text-slate-300" />
          </Link>

          <div className="text-center flex-1">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Jornada {jornada.numero}
            </h1>
            <p className={`text-sm md:text-base font-bold mt-1 uppercase tracking-wider ${jornada.estado === 'TERMINADA' ? 'text-emerald-400' :
              jornada.estado === 'EN PROGRESO' ? 'text-amber-400' : 'text-slate-400'
              }`}>
              {jornada.estado}
            </p>
          </div>

          {isAdmin && jornada.quinielaSubida ? (
            <button
              onClick={handleEdit}
              className="p-3 rounded-full bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 transition-all text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
              title="Editar jornada"
            >
              <Edit2 className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-12"></div>
          )}
        </div>

        {/* CONTENIDO DE TABLA */}
        <div className="bg-slate-800/40 rounded-3xl border border-slate-700/50 overflow-hidden shadow-2xl backdrop-blur-sm mb-8">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
              <thead>
                <tr className="bg-slate-800/80 border-b border-slate-700">
                  <th className="p-4 text-slate-400 font-semibold text-sm w-12 text-center">#</th>
                  <th className="p-4 text-slate-400 font-semibold text-sm">Partido</th>
                  <th className="p-4 text-slate-400 font-semibold text-sm text-center">Res/Fecha</th>
                  <th className="p-4 text-slate-400 font-semibold text-sm text-center w-16">Resultado</th>
                  {jornada.quinielaSubida && jornada.columnas.map((col, idx) => (
                    <th key={idx} className="p-4 text-slate-300 font-bold text-sm text-center bg-slate-800/50 border-l border-slate-700/50 min-w-[80px]">
                      {col.nombre}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jornada.partidos.map((partido, idx) => {
                  const isEven = idx % 2 === 0;
                  const isP15 = partido.numero === 'P-15';

                  return (
                    <tr key={idx} className={`${isEven ? 'bg-slate-800/40' : 'bg-slate-800/70'} hover:bg-slate-700/60 transition-colors border-b border-slate-700/50 last:border-0`}>
                      <td className={`p-4 text-center font-bold ${isP15 ? 'text-amber-400' : 'text-slate-500'}`}>
                        {partido.numero}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-slate-200">{partido.local}</span>
                          <span className="text-slate-500 text-xs font-medium">vs</span>
                          <span className="font-semibold text-slate-200">{partido.visitante}</span>
                          <span className="text-slate-500 text-xs font-semibold ml-1">({partido.genero})</span>
                        </div>
                      </td>
                      <td className="p-4 text-center text-sm">
                        {partido.estado === 'NO_EMPEZADO' ? (
                          <span className="text-slate-400 font-medium">{partido.fecha}</span>
                        ) : (
                          <span className="font-bold text-white tracking-widest text-base">{partido.golesLocal ?? '-'}-{partido.golesVisitante ?? '-'}</span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        {partido.estado === 'NO_EMPEZADO' ? (
                          <span className="text-slate-500 text-sm font-semibold">{partido.hora}</span>
                        ) : (
                          <div className="inline-flex items-center justify-center w-7 h-7 rounded bg-slate-900 border border-slate-600 font-bold text-white text-sm shadow-inner">
                            {isP15 ? (partido.plenoGoles || '-') : (partido.resultado1X2 || '-')}
                          </div>
                        )}
                      </td>

                      {/* PREDICCIONES DE JUGADORES - SOLO SI SUBIDA */}
                      {jornada.quinielaSubida && jornada.columnas.map((col, colIdx) => {
                        const isElige8 = colIdx === 0 && col.elige8Partidos?.includes(partido.numero as number);

                        const valorMostrar = isP15
                          ? (col.pleno15 || '-')
                          : col.pronosticos[idx];

                        let esAcierto = false;
                        if (partido.estado === 'FINALIZADO') {
                          if (isP15) {
                            esAcierto = Boolean(col.pleno15 && partido.plenoGoles && col.pleno15.trim() === partido.plenoGoles.trim());
                          } else {
                            const pronostico = col.pronosticos[idx] ? col.pronosticos[idx].trim() : '';
                            const resultado = partido.resultado1X2 ? partido.resultado1X2.trim() : '';
                            esAcierto = Boolean(pronostico && resultado && pronostico.includes(resultado));
                          }
                        }

                        let bgClass = 'bg-slate-700';
                        if (partido.estado === 'FINALIZADO') {
                          bgClass = esAcierto ? 'bg-emerald-600/80' : 'bg-rose-600/80';
                        }

                        return (
                          <td key={colIdx} className="p-4 text-center bg-slate-800/10 border-l border-slate-700/30">
                            <div className="flex justify-center items-center">
                              <div className={`min-w-[2rem] px-2 h-8 flex items-center justify-center font-bold text-sm text-white rounded shadow-sm transition-all ${bgClass} ${isElige8 ? 'ring-2 ring-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.8)]' : ''}`}>
                                {valorMostrar}
                              </div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ACCIONES O ESTADO SI NO ESTÁ SUBIDA */}
        {!jornada.quinielaSubida && (
          <div className="flex flex-col items-center justify-center py-12 px-4 bg-slate-800/30 rounded-3xl border border-slate-700/50 border-dashed mt-4">
            {isAdmin ? (
              <label className="cursor-pointer w-full max-w-sm flex flex-col items-center justify-center p-8 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-2xl shadow-xl transition-all hover:scale-[1.02] group">
                <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mb-5 group-hover:bg-blue-500/30 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all">
                  <Camera className="w-8 h-8 text-blue-400" />
                </div>
                <span className="text-xl font-bold text-white mb-2">Subir quiniela</span>
                <span className="text-sm text-slate-400 text-center px-4">Abre la cámara para escanear y digitalizar los boletos de esta jornada.</span>
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCaptura} />
              </label>
            ) : (
              <p className="text-lg text-slate-500 font-medium">Quiniela no subida aún para esta jornada</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
