import { Routes, Route } from 'react-router-dom';
import ClientsPage from './pages/ClientsPage';
import ProjectsPage from './pages/ProjectsPage';

const ClientRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<ClientsPage />} />
      <Route path="/projects" element={<ProjectsPage />} />
    </Routes>
  );
};

export default ClientRoutes;
