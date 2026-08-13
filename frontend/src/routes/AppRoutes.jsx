import { Routes, Route } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout';
import AdminLayout from '../layouts/AdminLayout';
import ProtectedRoute from '../components/common/ProtectedRoute';
import MemberRoute from '../components/common/MemberRoute';

import Home from '../pages/public/Home';
import About from '../pages/public/About';
import Board from '../pages/public/Board';
import Trainings from '../pages/public/Trainings';
import Events from '../pages/public/Events';
import Announcements from '../pages/public/Announcements';
import Recruitment from '../pages/public/Recruitment';
import Candidature from '../pages/public/Candidature';
import BookInterview from '../pages/public/BookInterview';
import ActivityInscription from '../pages/public/ActivityInscription';
import Login from '../pages/public/Login';
import MemberProfile from '../pages/public/MemberProfile';
import Projects from '../pages/public/Projects';
import ProjectSelection from '../pages/public/ProjectSelection';
import MyProjects from '../pages/public/MyProjects';

import AdminLogin from '../pages/admin/AdminLogin';
import Dashboard from '../pages/admin/Dashboard';
import ManageAnnouncements from '../pages/admin/ManageAnnouncements';
import ManageBoard from '../pages/admin/ManageBoard';
import ManageGallery from '../pages/admin/ManageGallery';
import ManageTrainings from '../pages/admin/ManageTrainings';
import ManageEvents from '../pages/admin/ManageEvents';
import ManageRH from '../pages/admin/ManageRH';
import ManageRecruitment from '../pages/admin/ManageRecruitment';
import ManageFinance from '../pages/admin/ManageFinance';
import ManageProjects from '../pages/admin/ManageProjects';
import ManageClubInfo from '../pages/admin/ManageClubInfo';
import ManageContact from '../pages/admin/ManageContact';

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="board" element={<Board />} />
        <Route path="trainings" element={<Trainings />} />
        <Route path="events" element={<Events />} />
        <Route path="events/:id/inscription" element={<ActivityInscription type="events" />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="projets" element={<Projects />} />
        <Route path="candidature" element={<Candidature />} />
        <Route path="candidature-media" element={<Candidature stream="media_babies" />} />
        <Route path="recrutement/reservation/:token" element={<BookInterview />} />
        <Route path="login" element={<Login />} />

        <Route element={<MemberRoute />}>
          <Route path="rh" element={<Recruitment />} />
          <Route path="profil" element={<MemberProfile />} />
          <Route path="selection-projets" element={<ProjectSelection />} />
          <Route path="mes-projets" element={<MyProjects />} />
          <Route path="trainings/:id/inscription" element={<ActivityInscription type="trainings" />} />
        </Route>
      </Route>

      <Route path="admin/login" element={<AdminLogin />} />

      <Route element={<ProtectedRoute />}>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="announcements" element={<ManageAnnouncements />} />
          <Route path="board" element={<ManageBoard />} />
          <Route path="gallery" element={<ManageGallery />} />
          <Route path="trainings" element={<ManageTrainings />} />
          <Route path="events" element={<ManageEvents />} />
          <Route path="recruitment" element={<ManageRecruitment />} />
          <Route path="finance" element={<ManageFinance />} />
          <Route path="projects" element={<ManageProjects />} />
          <Route path="rh" element={<ManageRH />} />
          <Route path="club-info" element={<ManageClubInfo />} />
          <Route path="contact" element={<ManageContact />} />
        </Route>
      </Route>
    </Routes>
  );
}
