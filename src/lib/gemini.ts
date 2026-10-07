import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

const PROMPT = `Eres un experto en visión artificial especializado en leer resguardos oficiales impresos de La Quiniela española (el ticket blanco emitido por terminal). Se te proporcionará una fotografía de un resguardo. Tu objetivo es extraer los pronósticos impresos y devolver ÚNICAMENTE un objeto JSON válido, sin código Markdown ni texto adicional.

REGLAS Y ESTRUCTURA VISUAL DEL TICKET:

1. PARTIDOS 1-14: Busca una lista numerada del "1." al "14." en el margen izquierdo. A su derecha, verás columnas con números de cabecera (1, 2, 3, 4...). Extrae los pronósticos ("1", "X", o "2") de todas las columnas jugadas, leyendo de arriba a abajo.

2. ELIGE 8: A la derecha de las columnas principales de apuestas, existe una columna independiente situada bajo el logotipo o título "ELIGE 8". Revisa esta columna fila por fila (del 1 al 14). Si hay un carácter impreso en esa fila, significa que ese partido pertenece al Elige 8. Devuelve un array con los NÚMEROS DE LOS PARTIDOS (del 1 al 14) que tienen marca en la columna Elige 8. Si la columna está vacía o no existe, devuelve [].

3. PLENO AL 15 (Partido 15): Se encuentra en la parte inferior, separado por una línea horizontal. Comienza con "15." seguido del pronóstico en formato de goles (ej. "1-2", "M-0", "2-M"). Asigna este valor EXACTO a la clave pleno15 ÚNICAMENTE dentro del objeto de la primera columna ("Columna 1").

4. Si alguna celda es ilegible o el resguardo está cortado, usa null.

ESTRUCTURA DEL JSON ESPERADA (Basada en un ticket real de 4 columnas):
{
"columnas": [
{ "nombre": "Columna 1", "pronosticos": ["X", "1", "2", "1", "X", "1", "1", "1", "2", "1", "2", "1", "2", "X"], "pleno15": "1-2" },
{ "nombre": "Columna 2", "pronosticos": ["X", "2", "2", "1", "2", "1", "X", "1", "2", "X", "2", "1", "X", "2"] },
{ "nombre": "Columna 3", "pronosticos": ["1", "X", "2", "1", "1", "1", "2", "1", "2", "1", "X", "X", "1", "1"] },
{ "nombre": "Columna 4", "pronosticos": ["X", "1", "2", "1", "X", "X", "1", "1", "2", "1", "X", "1", "2", "1"] }
],
"elige8": [2, 3, 4, 6, 8, 9, 11, 12]
}`;

// Convierte el archivo de imagen a base64 para enviarlo a Gemini
async function fileToGenerativePart(file: File) {
  return new Promise<{ inlineData: { data: string; mimeType: string } }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const base64Data = reader.result.split(',')[1];
        resolve({
          inlineData: {
            data: base64Data,
            mimeType: file.type
          }
        });
      } else {
        reject(new Error("Error al convertir la imagen a base64"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function analizarBoleto(imageFile: File): Promise<any> {
  const maxRetries = 3;
  const delayMs = 4000;
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });
      const imagePart = await fileToGenerativePart(imageFile);

      const result = await model.generateContent([PROMPT, imagePart]);
      const response = await result.response;
      let text = response.text().trim();

      // Limpieza del JSON en caso de que el LLM lo envuelva en bloques Markdown
      text = text.replace(/```(?:json)?/gi, '').trim();

      return JSON.parse(text);
    } catch (error) {
      lastError = error;
      console.warn(`Intento ${attempt} fallido al analizar boleto con Gemini:`, error);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  console.error("Error final tras reintentos al analizar boleto con Gemini:", lastError);
  throw new Error("No se pudo analizar la imagen de la quiniela. Asegúrate de que la foto se vea clara.");
}
