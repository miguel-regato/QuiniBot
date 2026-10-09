export async function obtenerUltimasJornadas(): Promise<any[]> {
  const hoy = new Date();

  const hace15Dias = new Date(hoy);
  hace15Dias.setDate(hoy.getDate() - 15);

  const en15Dias = new Date(hoy);
  en15Dias.setDate(hoy.getDate() + 15);

  const formatFecha = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };

  const url = `/api-selae/buscadorSorteos?game_id=LAQU&numeroSorteos=10&fechaInicioInclusiva=${formatFecha(hace15Dias)}&fechaFinInclusiva=${formatFecha(en15Dias)}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Error al conectar con la API de Loterías');
  }

  const data = await response.json();
  if (!data || data.length === 0) {
    throw new Error('No se encontraron sorteos en estas fechas');
  }

  const jornadasMapeadas = data.map((sorteo: any) => {
    const partidosMap = (sorteo.partidos || []).map((p: any) => {
      const isP15 = p.posicion === 15;

      // Parsear "2 - 1" a números independientes para golesLocal y golesVisitante
      let gLocal, gVisit, plenoG;
      if (p.marcador) {
        const partes = p.marcador.split('-').map((s: string) => s.trim());
        if (partes.length === 2) {
          if (isP15) {
            plenoG = `${partes[0]}-${partes[1]}`;
          } else {
            gLocal = parseInt(partes[0], 10);
            gVisit = parseInt(partes[1], 10);
          }
        }
      }

      // SELAE ya devuelve "Rayo Vallecano (m)", extraemos el género y limpiamos el nombre
      const stringLocal = p.local || '';
      const genero = stringLocal.toLowerCase().includes('(f)') ? 'f' : 'm';
      const localClean = stringLocal.replace(/\s*\([mf]\)\s*/i, '');
      const visitanteClean = (p.visitante || '').replace(/\s*\([mf]\)\s*/i, '');

      return {
        numero: isP15 ? 'P-15' : p.posicion,
        local: localClean,
        visitante: visitanteClean,
        genero: genero,
        resultado1X2: p.signo || null,
        golesLocal: gLocal !== undefined ? gLocal : null,
        golesVisitante: gVisit !== undefined ? gVisit : null,
        plenoGoles: plenoG || null,
        estado: (isP15 ? plenoG : p.signo) ? 'FINALIZADO' : 'NO_EMPEZADO',
        fecha: p.fecha ? p.fecha.replace(/-/g, '/') : '',
        hora: p.hora || ''
      };
    });

    // NUEVO: Comprobamos si ha terminado diferenciando entre el P-15 y los demás
    const todosTerminados = partidosMap.length > 0 && partidosMap.every((p: any) => {
      if (p.numero === 'P-15') {
        return p.plenoGoles !== null || p.resultado1X2 !== null;
      }
      return p.resultado1X2 !== null;
    });

    const ahora = new Date();
    const algunEmpezado = partidosMap.some((p: any) => {
      // NUEVO: Misma lógica para ver si alguno ya tiene resultado
      const tieneResultado = p.numero === 'P-15' ? (p.plenoGoles !== null || p.resultado1X2 !== null) : p.resultado1X2 !== null;
      if (tieneResultado) return true;

      if (p.fecha) {
        try {
          const parts = p.fecha.split('/');
          if (parts.length === 3) {
            const year = parts[0].length === 4 ? parts[0] : parts[2];
            const month = parts[1];
            const day = parts[0].length === 4 ? parts[2] : parts[0];
            const horaParts = (p.hora || '00:00').split(':');
            const fechaPartido = new Date(
              parseInt(year, 10),
              parseInt(month, 10) - 1,
              parseInt(day, 10),
              parseInt(horaParts[0], 10),
              parseInt(horaParts[1], 10)
            );
            return ahora > fechaPartido;
          }
        } catch (e) {
          // Ignorar fechas inválidas
        }
      }
      return false;
    });

    let estadoJornada = 'NO_COMENZADA';
    if (todosTerminados) {
      estadoJornada = 'TERMINADA';
    } else if (algunEmpezado) {
      estadoJornada = 'EN_PROGRESO';
    }

    return {
      id: `${sorteo.temporada}_J${sorteo.jornada}`,
      numero: parseInt(sorteo.jornada, 10),
      estado: estadoJornada,
      quinielaSubida: false,
      partidos: partidosMap,
      columnas: []
    };
  });

  return jornadasMapeadas;
}
