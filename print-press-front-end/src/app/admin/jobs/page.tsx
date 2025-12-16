import { JobList } from '@/components/jobs/job-list';

export default function AdminJobsPage() {
  return <JobList userRole="admin" />;
}
