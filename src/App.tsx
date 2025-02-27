
import { ThemeProvider } from 'next-themes';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import NotFound from './pages/NotFound';
import { Toaster } from 'sonner';

function App() {
  return (
    <ThemeProvider themes={['light', 'dark', 'banana']} defaultTheme="light">
      <Router>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
      <Toaster />
    </ThemeProvider>
  );
}

export default App;
