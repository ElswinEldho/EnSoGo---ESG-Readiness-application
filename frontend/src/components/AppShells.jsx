// Layout shells that combine the Sidebar with a scrollable content area.
// AssessmentShell reads :id from the URL and passes it to Sidebar so the
// workflow nav items appear.  AppShell renders the Sidebar without an assessment.
import { useParams } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';

export function AssessmentShell({ children }) {
  const { id } = useParams();
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar assessmentId={id} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function AppShell({ children }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar assessmentId={null} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
