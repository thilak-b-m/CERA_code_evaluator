import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import Card from '../../components/common/Card.jsx';
import Page from '../../components/common/Page.jsx';
import { studentService } from '../../services/studentService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatDateTime } from '../../utils/formatDate.js';

export default function StudentProfile() {
  const { id } = useParams();
  const { token } = useAuth();
  const [student, setStudent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError('');
    studentService.getDepartmentRecord(id, token)
      .then((record) => {
        if (!cancelled) setStudent(record);
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, token]);

  if (isLoading) {
    return (
      <Page title="Student record" subtitle="Loading the department roster entry.">
        <Card title="Student record">
          <div className="empty" role="status">Loading student record...</div>
        </Card>
      </Page>
    );
  }

  if (error) {
    return (
      <Page title="Student record" subtitle="The roster entry could not be loaded.">
        <Card title="Unable to load student record">
          <div className="empty" role="alert">{error}</div>
        </Card>
      </Page>
    );
  }

  if (!student) {
    return (
      <Page title="Student not found" subtitle="No matching student record is available in your department.">
        <Card title="Student record">
          <div className="empty">
            <Search size={28} />
            <p>No matching student record was found in your department.</p>
          </div>
        </Card>
      </Page>
    );
  }

  return (
    <Page
      eyebrow="DEPARTMENT ROSTER"
      title={student.name}
      subtitle={`${student.usn} · Year ${student.year} · ${student.department}`}
    >
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ['Assignments', student.totalAssignments],
            ['Submitted', student.submittedAssignments],
            ['Published results', student.publishedEvaluations],
            ['Average score', student.averagePercentage === null ? '—' : `${student.averagePercentage}%`],
          ].map(([label, value]) => (
            <Card key={label} title={label}>
              <p className="px-4 pb-4 text-2xl font-semibold">{value}</p>
            </Card>
          ))}
        </div>

        <Card title="Assignment record" kicker="Submissions and evaluation status">
          {student.assignments.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Assignment</th>
                    <th>Course</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th>Submitted</th>
                    <th>Review</th>
                  </tr>
                </thead>
                <tbody>
                  {student.assignments.map((assignment) => (
                    <tr key={assignment.assignmentId}>
                      <td>{assignment.title}</td>
                      <td>{assignment.course || '—'}</td>
                      <td>{assignment.evaluationStatus === 'published' ? 'Published' : assignment.evaluationStatus === 'draft' ? 'Needs review' : assignment.status}</td>
                      <td>
                        {assignment.score === null
                          ? '—'
                          : `${assignment.score}/${assignment.points}`}
                      </td>
                      <td>{formatDateTime(assignment.submittedAt)}</td>
                      <td>
                        {assignment.submissionId
                          ? <Link className="btn btn-ghost" to={`/submissions/${assignment.submissionId}`}>View</Link>
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">No active assignments are available.</div>
          )}
        </Card>
      </div>
    </Page>
  );
}
