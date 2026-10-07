import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SplashScreen } from './pages/SplashScreen';
import { Home } from './pages/Home';
import { JornadaView } from './pages/JornadaView';
import { ValidarQuiniela } from './pages/ValidarQuiniela';
import { TestApi } from './pages/TestApi';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SplashScreen />} />
        <Route path="/home" element={<Home />} />
        <Route path="/jornada/:id" element={<JornadaView />} />
        <Route path="/jornada/:id/validar" element={<ValidarQuiniela />} />
        <Route path="/test-api" element={<TestApi />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
