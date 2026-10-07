import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2, Trash2, Plus, AlertTriangle, ArrowRight, Check } from 'lucide-react';
import { analizarBoleto } from '../lib/gemini';
import { saveJornada } from '../lib/db';

// Mock Data
const MOCK_MATCHES = [
  { id: 1, local: 'Real Madrid', visitor: 'Barcelona' },
  { id: 2, local: 'Atlético', visitor: 'Sevilla' },
  { id: 3, local: 'Betis', visitor: 'Valencia' },
  { id: 4, local: 'Athletic', visitor: 'Real Sociedad' },
  { id: 5, local: 'Villarreal', visitor: 'Getafe' },
  { id: 6, local: 'Osasuna', visitor: 'Celta' },
  { id: 7, local: 'Mallorca', visitor: 'Girona' },
  { id: 8, local: 'Alavés', visitor: 'Las Palmas' },
  { id: 9, local: 'Rayo Vallecano', visitor: 'Almería' },
  { id: 10, local: 'Granada', visitor: 'Cádiz' },
  { id: 11, local: 'Espanyol', visitor: 'Valladolid' },
  { id: 12, local: 'Zaragoza', visitor: 'Sporting' },
  { id: 13, local: 'Levante', visitor: 'Elche' },
  { id: 14, local: 'Tenerife', visitor: 'Eibar' },
];

const MOCK_P15 = { local: 'España', visitor: 'Italia' };

type Prediction = '1' | 'X' | '2' | null;
type P15Prediction = '0' | '1' | '2' | 'M' | null;

interface Column {
  id: string;
  name: string;
  predictions: Prediction[];
  p15: { local: P15Prediction; visitor: P15Prediction };
}

export const ValidarQuiniela: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { imageFile, jornadaOriginal } = location.state || {};

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [elige8Ids, setElige8Ids] = useState<number[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const hasFetched = useRef(false);

  const matches = jornadaOriginal?.partidos.slice(0, 14).map((p: any) => ({
    id: typeof p.numero === 'number' ? p.numero : Number(p.numero),
    local: p.local,
    visitor: p.visitante
  })) || MOCK_MATCHES;

  const p15Partido = jornadaOriginal?.partidos.find((p: any) => p.numero === 'P-15');
  const p15 = p15Partido ? { local: p15Partido.local, visitor: p15Partido.visitante } : MOCK_P15;

  useEffect(() => {
    if (!imageFile || !jornadaOriginal) {
      navigate(-1);
      return;
    }

    if (!hasFetched.current) {
      hasFetched.current = true;

      async function analyze() {
        try {
          const datosIA = await analizarBoleto(imageFile);

          setElige8Ids(datosIA.elige8 || []);

          const newCols: Column[] = datosIA.columnas.map((c: any, index: number) => {
            let p15Local: P15Prediction = null;
            let p15Visitor: P15Prediction = null;

            if (index === 0 && c.pleno15) {
              const parts = c.pleno15.split('-');
              if (parts.length === 2) {
                p15Local = parts[0] as P15Prediction;
                p15Visitor = parts[1] as P15Prediction;
              }
            }

            return {
              id: crypto.randomUUID(),
              name: c.nombre || `Columna ${index + 1}`,
              predictions: c.pronosticos.map((p: string | null) => p as Prediction),
              p15: { local: p15Local, visitor: p15Visitor }
            };
          });

          setColumns(newCols);
          setIsLoading(false);
        } catch (err: any) {
          setErrorMsg(err.message || 'Error al analizar el boleto');
          setIsLoading(false);
        }
      }
      analyze();
    }
  }, [imageFile, jornadaOriginal, navigate]);

  // Validation Logic
  const errors: string[] = [];

  if (!isLoading) {
    if (elige8Ids.length !== 0 && elige8Ids.length !== 8) {
      errors.push(`El Elige 8 debe tener 0 u 8 partidos seleccionados (tienes ${elige8Ids.length}).`);
    }

    columns.forEach((col, colIndex) => {
      const missingCount = col.predictions.filter((p) => p === null).length;
      if (missingCount > 0) {
        errors.push(`${col.name} tiene ${missingCount} pronósticos vacíos.`);
      }
      if (colIndex === 0) {
        if (!col.p15.local || !col.p15.visitor) {
          errors.push(`El Pleno al 15 está incompleto en la Columna 1.`);
        }
      }
    });
  }

  const isValid = errors.length === 0;

  // Handlers
  const toggleElige8 = (matchId: number) => {
    setElige8Ids((prev) =>
      prev.includes(matchId) ? prev.filter((id) => id !== matchId) : [...prev, matchId]
    );
  };

  const updateColumnName = (colId: string, newName: string) => {
    setColumns((prev) =>
      prev.map((col) => (col.id === colId ? { ...col, name: newName } : col))
    );
  };

  const deleteColumn = (colId: string) => {
    if (columns.length > 1) {
      setColumns((prev) => prev.filter((col) => col.id !== colId));
    }
  };

  const addColumn = () => {
    const newCol: Column = {
      id: crypto.randomUUID(),
      name: `Columna ${columns.length + 1}`,
      predictions: Array(14).fill(null),
      p15: { local: null, visitor: null }
    };
    setColumns((prev) => [...prev, newCol]);
  };

  const updatePrediction = (colId: string, matchIndex: number, value: Prediction) => {
    setColumns((prev) =>
      prev.map((col) => {
        if (col.id === colId) {
          const newPredictions = [...col.predictions];
          // Toggle off if clicking the same value
          newPredictions[matchIndex] = newPredictions[matchIndex] === value ? null : value;
          return { ...col, predictions: newPredictions };
        }
        return col;
      })
    );
  };

  const updateP15 = (colId: string, team: 'local' | 'visitor', value: P15Prediction) => {
    setColumns((prev) =>
      prev.map((col) => {
        if (col.id === colId) {
          return {
            ...col,
            p15: {
              ...col.p15,
              [team]: col.p15[team] === value ? null : value
            }
          };
        }
        return col;
      })
    );
  };

  const handleGuardar = async () => {
    if (!isValid || !jornadaOriginal) return;

    try {
      const jornadaActualizada = {
        ...jornadaOriginal,
        quinielaSubida: true,
        columnas: columns.map((col, index) => ({
          nombre: col.name,
          pronosticos: col.predictions,
          ...(index === 0 && col.p15.local && col.p15.visitor
            ? { pleno15: `${col.p15.local}-${col.p15.visitor}` }
            : {}),
          ...(index === 0 && elige8Ids.length > 0
            ? { elige8Partidos: elige8Ids }
            : {})
        }))
      };

      const cleanJornada = JSON.parse(JSON.stringify(jornadaActualizada));
      await saveJornada(cleanJornada);

      navigate(`/jornada/${jornadaOriginal.id}`);
    } catch (error: any) {
      console.error(error);
      alert('Error al guardar en Firebase: ' + error.message);
    }
  };

  if (errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4 text-center">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Error</h2>
        <p className="text-gray-400 mb-6">{errorMsg}</p>
        <button onClick={() => navigate(-1)} className="px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 transition">
          Volver
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
        <Loader2 className="w-16 h-16 animate-spin text-blue-500 mb-6" />
        <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent animate-pulse">
          Analizando boleto con IA...
        </h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans selection:bg-blue-500/30">
      <header className="sticky top-0 z-20 bg-gray-900/80 backdrop-blur-md border-b border-gray-800 p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="bg-gradient-to-br from-blue-500 to-purple-600 w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-lg">
              <Check className="w-5 h-5" />
            </span>
            Validar Pronósticos
          </h1>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 flex flex-col gap-6">
        {/* Warning Panel */}
        {errors.length > 0 && (
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex flex-col gap-2 shadow-lg">
            <div className="flex items-center gap-2 text-orange-400 font-semibold mb-1">
              <AlertTriangle className="w-5 h-5" />
              <span>Avisos de validación</span>
            </div>
            <ul className="list-disc list-inside text-orange-300/90 text-sm space-y-1">
              {errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Interactive Table */}
        <div className="relative rounded-2xl border border-gray-800 bg-gray-900/50 shadow-2xl overflow-hidden flex flex-col">
          {/* Scrollable container */}
          <div className="overflow-x-auto pb-4">
            <div className="min-w-max p-4 grid gap-4">

              {/* Header Row */}
              <div className="flex items-end gap-6 pb-4 border-b border-gray-800">
                {/* Matches Column Header */}
                <div className="w-64 shrink-0 px-2 text-sm font-medium text-gray-400">
                  Partidos
                </div>

                {/* Player Columns */}
                {columns.map((col) => (
                  <div key={col.id} className="w-48 shrink-0 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <input
                        type="text"
                        value={col.name}
                        onChange={(e) => updateColumnName(col.id, e.target.value)}
                        className="bg-gray-800/80 text-white font-medium px-3 py-1.5 rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none w-full transition-all"
                      />
                      {columns.length > 1 && (
                        <button
                          onClick={() => deleteColumn(col.id)}
                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                          title="Eliminar columna"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Add Column Button */}
                <div className="w-32 shrink-0 flex items-center h-[38px]">
                  <button
                    onClick={addColumn}
                    className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 px-3 py-1.5 rounded-lg font-medium text-sm transition-colors border border-dashed border-blue-500/30 w-full justify-center"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Añadir</span>
                  </button>
                </div>
              </div>

              {/* Match Rows 1-14 */}
              <div className="flex flex-col gap-3">
                {matches.map((match: any, matchIndex: number) => {
                  const isElige8 = elige8Ids.includes(match.id);

                  return (
                    <div key={match.id} className="flex items-center gap-6 group hover:bg-gray-800/30 p-2 rounded-xl transition-colors -ml-2">
                      {/* Match Info */}
                      <button
                        onClick={() => toggleElige8(match.id)}
                        className="w-64 shrink-0 flex items-center gap-3 text-left focus:outline-none"
                      >
                        <div className={`flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold transition-all ${isElige8
                          ? 'bg-blue-500 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]'
                          : 'bg-gray-800 text-gray-400 group-hover:bg-gray-700'
                          }`}>
                          {match.id}
                        </div>
                        <div className="flex flex-col">
                          <span className={`text-sm font-medium transition-colors ${isElige8 ? 'text-blue-400' : 'text-gray-200'}`}>
                            {match.local} <span className="text-gray-500 mx-1">vs</span> {match.visitor}
                          </span>
                        </div>
                      </button>

                      {/* Predictions per column */}
                      {columns.map((col, colIndex) => {
                        const pred = col.predictions[matchIndex];
                        // Highlight E8 cell for column 1
                        const isE8Cell = isElige8 && colIndex === 0;

                        return (
                          <div key={`${col.id}-${match.id}`} className="w-48 shrink-0 flex justify-center">
                            <div className={`flex bg-gray-800/50 rounded-lg p-1 gap-1 transition-all ${isE8Cell ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-gray-900 shadow-[0_0_15px_rgba(59,130,246,0.2)] bg-blue-900/20' : ''
                              }`}>
                              {(['1', 'X', '2'] as Prediction[]).map((val) => {
                                const isSelected = pred === val;
                                return (
                                  <button
                                    key={val}
                                    onClick={() => updatePrediction(col.id, matchIndex, val)}
                                    className={`w-10 h-10 rounded-md flex items-center justify-center font-bold text-sm transition-all duration-200 active:scale-95 ${isSelected
                                      ? 'bg-gradient-to-b from-green-400 to-green-600 text-white shadow-lg'
                                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                                      }`}
                                  >
                                    {val}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                      <div className="w-32 shrink-0"></div> {/* Spacer for Add Button column */}
                    </div>
                  );
                })}
              </div>

              {/* P-15 Row */}
              <div className="mt-4 pt-6 border-t border-gray-800 flex items-start gap-6 relative">
                <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent"></div>

                <div className="w-64 shrink-0 flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6 rounded-md bg-purple-500/20 text-purple-400 text-xs font-bold border border-purple-500/30">
                    15
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold text-purple-400">Pleno al 15</span>
                    <span className="text-xs text-gray-400">{p15.local} vs {p15.visitor}</span>
                  </div>
                </div>

                {/* Columns P15 */}
                {columns.map((col, colIndex) => {
                  if (colIndex !== 0) {
                    return (
                      <div key={col.id} className="w-48 shrink-0 flex items-center justify-center">
                        <span className="text-gray-600 text-xs italic bg-gray-800/30 px-3 py-1 rounded-full">No aplicable</span>
                      </div>
                    );
                  }

                  return (
                    <div key={col.id} className="w-48 shrink-0 flex flex-col gap-3">
                      {/* Local P15 */}
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider text-center">{p15.local}</span>
                        <div className="flex bg-gray-800/50 rounded-lg p-1 gap-1">
                          {(['0', '1', '2', 'M'] as P15Prediction[]).map((val) => {
                            const isSelected = col.p15.local === val;
                            return (
                              <button
                                key={`local-${val}`}
                                onClick={() => updateP15(col.id, 'local', val)}
                                className={`flex-1 h-9 rounded-md flex items-center justify-center font-bold text-xs transition-all active:scale-95 ${isSelected
                                  ? 'bg-purple-600 text-white shadow-md'
                                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                  }`}
                              >
                                {val}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Visitor P15 */}
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-gray-500 uppercase font-semibold tracking-wider text-center">{p15.visitor}</span>
                        <div className="flex bg-gray-800/50 rounded-lg p-1 gap-1">
                          {(['0', '1', '2', 'M'] as P15Prediction[]).map((val) => {
                            const isSelected = col.p15.visitor === val;
                            return (
                              <button
                                key={`visitor-${val}`}
                                onClick={() => updateP15(col.id, 'visitor', val)}
                                className={`flex-1 h-9 rounded-md flex items-center justify-center font-bold text-xs transition-all active:scale-95 ${isSelected
                                  ? 'bg-purple-600 text-white shadow-md'
                                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                  }`}
                              >
                                {val}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        </div>

      </main>

      {/* Footer Action */}
      <footer className="sticky bottom-0 z-20 bg-gray-900/90 backdrop-blur-md border-t border-gray-800 p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">Estado:</span>
            {isValid ? (
              <span className="text-green-400 font-medium flex items-center gap-1">
                <Check className="w-4 h-4" /> Listo para guardar
              </span>
            ) : (
              <span className="text-orange-400 font-medium flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> Faltan datos
              </span>
            )}
          </div>
          <button
            disabled={!isValid}
            onClick={handleGuardar}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 ${isValid
              ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] transform hover:-translate-y-0.5'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
          >
            Guardar y Confirmar
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </div>
  );
};
