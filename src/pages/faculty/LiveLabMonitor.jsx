import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  AlertTriangle,
  ArrowRight,
  SlidersHorizontal,
  Search,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';

import Page from '../../components/common/Page.jsx';
import Modal from '../../components/common/Modal.jsx';
import Card from '../../components/common/Card.jsx';
import Avatar from '../../components/faculty/Avatar.jsx';
import StatusBadge from '../../components/common/StatusBadge.jsx';

import { useApp } from '../../context/AppContext.jsx';
import { liveLabService } from '../../services/liveLabService.js';


function getStatusTone(status) {
  if (status === 'Needs help') {
    return 'warning';
  }

  if (status === 'Passed') {
    return 'success';
  }

  return 'live';
}


export default function LiveLabMonitor() {
  const { notify } = useApp();


  /*
   * INITIAL LIVE LAB DATA
   *
   * The page communicates with the live-lab
   * data through the service boundary.
   *
   * The current implementation is frontend-only.
   * A backend/API can replace the service later
   * without requiring UI changes.
   */
  const initialLiveLabData = useMemo(
    () => liveLabService.getOverview(),
    []
  );


  /*
   * LIVE LAB DATA STATE
   */
  const [liveLabInfo, setLiveLabInfo] =
    useState(
      () => ({
        ...initialLiveLabData.info,
      })
    );

  const [liveStudents, setLiveStudents] =
    useState(
      () => [
        ...initialLiveLabData.students,
      ]
    );

  const [liveLabHealth, setLiveLabHealth] =
    useState(
      () => ({
        ...initialLiveLabData.health,
      })
    );

  const [
    liveLabAttention,
    setLiveLabAttention,
  ] = useState(
    () => ({
      ...initialLiveLabData.attention,
    })
  );


  /*
   * UI STATE
   */
  const [search, setSearch] =
    useState('');

  const [sortMode, setSortMode] =
    useState('activity');

  const [lastRefresh, setLastRefresh] =
    useState(() => new Date());

  const [selectedStudent, setSelectedStudent] =
    useState(null);


  /*
   * FORMAT REFRESH TIME
   */
  const formatRefreshTime = (date) => {
    if (!(date instanceof Date)) {
      return '';
    }

    return date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    });
  };


  /*
   * UPDATE LIVE LAB DATA
   *
   * The UI remains frontend-only.
   * The service is the data boundary.
   */
  const updateLiveLabData = () => {
    const refreshedData =
      liveLabService.getOverview();

    setLiveLabInfo({
      ...refreshedData.info,
    });

    setLiveStudents([
      ...refreshedData.students,
    ]);

    setLiveLabHealth({
      ...refreshedData.health,
    });

    setLiveLabAttention({
      ...refreshedData.attention,
    });


    /*
     * Keep selected session in sync
     * with refreshed data.
     */
    setSelectedStudent((current) => {
      if (!current) {
        return null;
      }

      const refreshedStudent =
        refreshedData.students.find(
          (student) =>
            student.id === current.id
        );

      return refreshedStudent ?? null;
    });


    setLastRefresh(new Date());
  };


  /*
   * MANUAL REFRESH
   */
  const handleRefresh = () => {
    updateLiveLabData();

    notify(
      'Live lab refreshed just now'
    );
  };


  /*
   * AUTOMATIC REFRESH
   *
   * Refreshes every 8 seconds.
   */
  useEffect(() => {
    const interval = setInterval(() => {
      updateLiveLabData();
    }, 8000);

    return () => {
      clearInterval(interval);
    };
  }, []);


  /*
   * SEARCH + SORT
   */
  const filteredStudents = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    let result = liveStudents.filter(
      (student) => {
        const name = String(
          student.name ?? ''
        ).toLowerCase();

        const task = String(
          student.task ?? ''
        ).toLowerCase();

        const language = String(
          student.lang ?? ''
        ).toLowerCase();

        const status = String(
          student.status ?? ''
        ).toLowerCase();

        return (
          name.includes(query) ||
          task.includes(query) ||
          language.includes(query) ||
          status.includes(query)
        );
      }
    );


    if (sortMode === 'status') {
      result = [...result].sort(
        (a, b) =>
          String(
            a.status ?? ''
          ).localeCompare(
            String(
              b.status ?? ''
            )
          )
      );
    }


    if (sortMode === 'student') {
      result = [...result].sort(
        (a, b) =>
          String(
            a.name ?? ''
          ).localeCompare(
            String(
              b.name ?? ''
            )
          )
      );
    }


    return result;
  }, [
    liveStudents,
    search,
    sortMode,
  ]);


  /*
   * ROOM HEALTH
   */
  const roomHealth = useMemo(() => {
    const healthy = Number(
      liveLabHealth?.healthy ?? 0
    );

    const slow = Number(
      liveLabHealth?.slow ?? 0
    );

    const critical = Number(
      liveLabHealth?.critical ?? 0
    );

    const total =
      healthy +
      slow +
      critical;


    const healthyPercentage =
      total > 0
        ? Math.round(
            (healthy / total) * 100
          )
        : 0;


    const slowEnd =
      total > 0
        ? Math.round(
            ((healthy + slow) /
              total) *
              100
          )
        : 0;


    return {
      healthy,
      slow,
      critical,
      total,
      healthyPercentage,
      slowEnd,
    };
  }, [liveLabHealth]);


  /*
   * STUDENT WHO NEEDS ATTENTION
   */
  const attentionStudent =
    useMemo(() => {
      if (
        !liveLabAttention?.studentId
      ) {
        return null;
      }

      return liveStudents.find(
        (student) =>
          student.id ===
          liveLabAttention.studentId
      );
    }, [
      liveStudents,
      liveLabAttention,
    ]);


  /*
   * SORT
   */
  const handleSort = () => {
    setSortMode((current) => {
      if (current === 'activity') {
        notify(
          'Sessions sorted by status'
        );

        return 'status';
      }


      if (current === 'status') {
        notify(
          'Sessions sorted by student name'
        );

        return 'student';
      }


      notify(
        'Sessions sorted by activity'
      );

      return 'activity';
    });
  };


  /*
   * OPEN SESSION
   */
  const handleOpenSession = (
    student
  ) => {
    setSelectedStudent(student);
  };


  /*
   * CLOSE SESSION
   */
  const handleCloseSession = () => {
    setSelectedStudent(null);
  };


  /*
   * OFFER HELP
   */
  const handleOfferHelp = () => {
    if (!attentionStudent) {
      notify(
        'No student currently needs help'
      );

      return;
    }


    notify(
      `Help request sent to ${attentionStudent.name}`
    );
  };


  return (
    <>
      <Page
        eyebrow="LIVE MONITOR · AUTO-REFRESH 8S"
        title="Live lab monitor"
        subtitle="Intervene where it matters. Every active session, in one view."
        actions={
          <>
            <StatusBadge tone="live">
              {liveStudents.length} active sessions
            </StatusBadge>

            <button
              type="button"
              className="btn btn-ghost"
              onClick={handleRefresh}
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </>
        }
      >

        {/* SEARCH */}

        <div
          style={{
            display: 'flex',
            gap: 9,
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <div
            className="search-box"
            style={{
              flex: 1,
            }}
          >
            <Search size={15} />

            <input
              className="input"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search active students..."
              aria-label="Search active students"
            />
          </div>


          {search && (
            <button
              type="button"
              className="btn btn-soft"
              onClick={() =>
                setSearch('')
              }
            >
              Clear
            </button>
          )}
        </div>


        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'minmax(0,1.3fr) minmax(280px,.7fr)',
            gap: 14,
          }}
        >

          {/* ACTIVE SESSIONS */}

          <Card
            title="Active sessions"
            kicker={`${liveLabInfo.course} · ${liveLabInfo.lab} · ${filteredStudents.length} shown`}
            action={
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleSort}
              >
                <SlidersHorizontal
                  size={14}
                />
                Sort
              </button>
            }
          >
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Working on</th>
                    <th>Language</th>
                    <th>Session</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>

                <tbody>
                  {filteredStudents.map(
                    (student) => (
                      <tr
                        key={student.id}
                      >
                        <td>
                          <div
                            style={{
                              display:
                                'flex',
                              gap: 9,
                              alignItems:
                                'center',
                            }}
                          >
                            <Avatar
                              color={
                                student.color
                              }
                            >
                              {
                                student.initials
                              }
                            </Avatar>

                            <button
                              type="button"
                              onClick={() =>
                                handleOpenSession(
                                  student
                                )
                              }
                              style={{
                                border:
                                  'none',
                                background:
                                  'none',
                                padding: 0,
                                margin: 0,
                                color:
                                  'var(--text)',
                                fontWeight:
                                  700,
                                cursor:
                                  'pointer',
                                font: 'inherit',
                                textAlign:
                                  'left',
                              }}
                            >
                              {student.name}
                            </button>
                          </div>
                        </td>

                        <td>
                          {student.task}
                        </td>

                        <td>
                          {student.lang}
                        </td>

                        <td
                          style={{
                            fontFamily:
                              'var(--app-font-mono)',
                            fontSize: 11,
                          }}
                        >
                          {student.time}
                        </td>

                        <td>
                          <StatusBadge
                            tone={getStatusTone(
                              student.status
                            )}
                          >
                            {student.status}
                          </StatusBadge>
                        </td>

                        <td>
                          <button
                            type="button"
                            className="icon-btn"
                            aria-label={`Open ${student.name} session`}
                            title={`Open ${student.name} session`}
                            onClick={() =>
                              handleOpenSession(
                                student
                              )
                            }
                          >
                            <ArrowRight
                              size={15}
                            />
                          </button>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>


            {filteredStudents.length ===
              0 && (
              <div
                className="empty"
                style={{
                  padding: 45,
                }}
              >
                <Search size={28} />

                <div
                  style={{
                    color:
                      'var(--text)',
                    fontWeight: 700,
                  }}
                >
                  No active sessions
                  found
                </div>

                <p
                  style={{
                    fontSize: 12,
                  }}
                >
                  Try another student,
                  language or status.
                </p>
              </div>
            )}
          </Card>


          {/* RIGHT SIDE */}

          <div
            style={{
              display: 'grid',
              gap: 14,
            }}
          >

            {/* ROOM PULSE */}

            <Card
              title="Room pulse"
              kicker="Current lab health"
            >
              <div
                style={{
                  padding: 20,
                  display: 'grid',
                  placeItems:
                    'center',
                }}
              >
                <div
                  style={{
                    width: 170,
                    height: 170,
                    borderRadius: '50%',
                    background:
                      `conic-gradient(
                        var(--success) 0 ${roomHealth.healthyPercentage}%,
                        var(--warning) ${roomHealth.healthyPercentage}% ${roomHealth.slowEnd}%,
                        var(--error) ${roomHealth.slowEnd}% 100%
                      )`,
                    display: 'grid',
                    placeItems:
                      'center',
                  }}
                >
                  <div
                    style={{
                      width: 133,
                      height: 133,
                      borderRadius:
                        '50%',
                      background:
                        'var(--card)',
                      display: 'grid',
                      placeItems:
                        'center',
                      textAlign:
                        'center',
                    }}
                  >
                    <strong
                      style={{
                        font:
                          '28px var(--app-font-mono)',
                      }}
                    >
                      {
                        roomHealth.healthyPercentage
                      }
                      %
                    </strong>

                    <small
                      style={{
                        color:
                          'var(--muted)',
                        fontSize: 10,
                      }}
                    >
                      healthy
                    </small>
                  </div>
                </div>
              </div>


              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'space-around',
                  padding:
                    '0 14px 18px',
                  fontSize: 11,
                }}
              >
                <span>
                  <i
                    style={{
                      color:
                        'var(--success)',
                    }}
                  >
                    ●
                  </i>{' '}
                  {
                    roomHealth.healthy
                  }{' '}
                  healthy
                </span>

                <span>
                  <i
                    style={{
                      color:
                        'var(--warning)',
                    }}
                  >
                    ●
                  </i>{' '}
                  {roomHealth.slow} slow
                </span>

                <span>
                  <i
                    style={{
                      color:
                        'var(--error)',
                    }}
                  >
                    ●
                  </i>{' '}
                  {
                    roomHealth.critical
                  }{' '}
                  critical
                </span>
              </div>
            </Card>


            {/* NEEDS ATTENTION */}

            <Card title="Needs attention">
              {attentionStudent ? (
                <div className="activity-item">
                  <AlertTriangle
                    size={18}
                    color="var(--warning)"
                  />

                  <div
                    style={{
                      fontSize: 12,
                    }}
                  >
                    <strong>
                      {
                        attentionStudent.name
                      }
                    </strong>{' '}
                    has{' '}
                    {
                      liveLabAttention.count
                    }{' '}
                    {String(
                      liveLabAttention.issue ??
                        'issues'
                    ).toLowerCase()}
                    .

                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{
                        marginTop: 9,
                        minHeight: 30,
                      }}
                      onClick={
                        handleOfferHelp
                      }
                    >
                      Offer help
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="empty"
                  style={{
                    padding: 30,
                  }}
                >
                  <CheckCircle2
                    size={28}
                  />

                  <div
                    style={{
                      color:
                        'var(--text)',
                      fontWeight: 700,
                    }}
                  >
                    No attention required
                  </div>

                  <p
                    style={{
                      fontSize: 12,
                    }}
                  >
                    All active sessions are
                    currently on track.
                  </p>
                </div>
              )}
            </Card>


            {/* MONITOR STATUS */}

            <Card
              title="Monitor status"
              kicker="Live connection"
            >
              <div
                style={{
                  padding: 20,
                  display: 'grid',
                  gap: 10,
                  fontSize: 11,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                  }}
                >
                  <span
                    style={{
                      color:
                        'var(--muted)',
                    }}
                  >
                    Connection
                  </span>

                  <StatusBadge tone="success">
                    Live
                  </StatusBadge>
                </div>


                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                  }}
                >
                  <span
                    style={{
                      color:
                        'var(--muted)',
                    }}
                  >
                    Auto-refresh
                  </span>

                  <span
                    style={{
                      fontFamily:
                        'var(--app-font-mono)',
                    }}
                  >
                    Every 8s
                  </span>
                </div>


                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                  }}
                >
                  <span
                    style={{
                      color:
                        'var(--muted)',
                    }}
                  >
                    Last refresh
                  </span>

                  <span
                    style={{
                      fontFamily:
                        'var(--app-font-mono)',
                    }}
                  >
                    {formatRefreshTime(
                      lastRefresh
                    )}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </Page>


      {/* SESSION DETAILS MODAL */}

      <Modal
        open={Boolean(selectedStudent)}
        title={
          selectedStudent
            ? `${selectedStudent.name} · Live session`
            : 'Live session'
        }
        onClose={handleCloseSession}
      >
        {selectedStudent && (
          <div
            style={{
              display: 'grid',
              gap: 16,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <Avatar
                color={
                  selectedStudent.color
                }
              >
                {
                  selectedStudent.initials
                }
              </Avatar>

              <div>
                <div
                  style={{
                    color:
                      'var(--text)',
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  {selectedStudent.name}
                </div>

                <div
                  style={{
                    color:
                      'var(--muted)',
                    fontSize: 11,
                    marginTop: 3,
                  }}
                >
                  {selectedStudent.id}
                </div>
              </div>
            </div>


            <div
              style={{
                display: 'grid',
                gap: 10,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  gap: 20,
                }}
              >
                <span
                  style={{
                    color:
                      'var(--muted)',
                    fontSize: 11,
                  }}
                >
                  Working on
                </span>

                <span
                  style={{
                    fontSize: 11,
                    textAlign: 'right',
                  }}
                >
                  {selectedStudent.task}
                </span>
              </div>


              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  gap: 20,
                }}
              >
                <span
                  style={{
                    color:
                      'var(--muted)',
                    fontSize: 11,
                  }}
                >
                  Language
                </span>

                <span
                  style={{
                    fontSize: 11,
                  }}
                >
                  {selectedStudent.lang}
                </span>
              </div>


              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  gap: 20,
                }}
              >
                <span
                  style={{
                    color:
                      'var(--muted)',
                    fontSize: 11,
                  }}
                >
                  Session
                </span>

                <span
                  style={{
                    fontFamily:
                      'var(--app-font-mono)',
                    fontSize: 11,
                  }}
                >
                  {selectedStudent.time}
                </span>
              </div>


              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  alignItems:
                    'center',
                  gap: 20,
                }}
              >
                <span
                  style={{
                    color:
                      'var(--muted)',
                    fontSize: 11,
                  }}
                >
                  Status
                </span>

                <StatusBadge
                  tone={getStatusTone(
                    selectedStudent.status
                  )}
                >
                  {
                    selectedStudent.status
                  }
                </StatusBadge>
              </div>
            </div>


            <div
              style={{
                display: 'flex',
                justifyContent:
                  'flex-end',
                gap: 8,
                paddingTop: 4,
              }}
            >
              <button
                type="button"
                className="btn btn-ghost"
                onClick={
                  handleCloseSession
                }
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}