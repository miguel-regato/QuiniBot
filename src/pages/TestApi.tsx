import React, { useState } from 'react';
import { obtenerUltimasJornadas } from '../lib/apiLoterias';
import type { DetalleJornada } from './JornadaView';

export const TestApi: React.FC = () => {
  const [resultado, setResultado] = useState<DetalleJornada[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCallApi = async () => {
    try {
      setError(null);
      setResultado(null);
      const data = await obtenerUltimasJornadas();
      setResultado(data);
    } catch (err: any) {
      setError(err.message || 'Error desconocido al llamar a la API');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 flex flex-col items-center gap-8">
      <h1 className="text-3xl font-bold">Test API Loterías</h1>
      <button
        onClick={handleCallApi}
        className="bg-blue-600 hover:bg-blue-500 text-white text-2xl font-bold py-6 px-12 rounded-xl shadow-lg transition-colors"
      >
        Llamar a Loterías
      </button>

      <div className="w-full max-w-4xl">
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 p-4 rounded mb-4">
            {error}
          </div>
        )}

        {resultado && (
          <pre className="bg-black text-green-400 p-4 rounded overflow-auto max-h-[600px] border border-gray-800 shadow-2xl text-sm">
            {JSON.stringify(resultado, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
};
