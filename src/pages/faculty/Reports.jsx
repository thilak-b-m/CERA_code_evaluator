import { useEffect, useState } from 'react';
import { Download, Check, CheckCircle2, FileText } from 'lucide-react';
import Page from '../../components/common/Page.jsx';
import Card from '../../components/common/Card.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { reportService } from '../../services/reportService.js';

export default function Reports() {
  const { notify } = useApp();

  const [sections, setSections] = useState([]);
  const [recentExports, setRecentExports] = useState([]);
  const [selectedSections, setSelectedSections] = useState([]);
  const [format, setFormat] = useState('PDF document');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadReports() {
      const data = await reportService.get();

      if (!mounted) return;

      setSections(data.sections || []);
      setRecentExports(data.recentExports || []);

      if (data.savedTemplate) {
        setSelectedSections(data.savedTemplate.selectedSectionIds || []);
        setFormat(data.savedTemplate.format || 'PDF document');
      } else {
        setSelectedSections(
          (data.sections || [])
            .filter((section) => section.defaultSelected)
            .map((section) => section.id)
        );
      }
    }

    loadReports();

    return () => {
      mounted = false;
    };
  }, []);

  const toggleSection = (sectionId) => {
    setSelectedSections((current) =>
      current.includes(sectionId)
        ? current.filter((id) => id !== sectionId)
        : [...current, sectionId]
    );
  };

  const handleExport = async () => {
    if (selectedSections.length === 0) {
      notify('Select at least one report section');
      return;
    }

    setGenerating(true);

    try {
      const report = await reportService.generate({
        selectedSectionIds: selectedSections,
        format,
      });

      if (!report) {
        notify('Unable to generate report');
        return;
      }

      const url = URL.createObjectURL(report.blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = report.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);

      const data = await reportService.get();
      setRecentExports(data.recentExports || []);

      notify('Report exported successfully');
    } catch (error) {
      console.error('Error exporting report:', error);
      notify('Failed to export report');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (selectedSections.length === 0) {
      notify('Select at least one report section');
      return;
    }

    try {
      await reportService.saveTemplate(selectedSections, format);
      notify('Report template saved');
    } catch (error) {
      console.error('Error saving report template:', error);
      notify('Failed to save report template');
    }
  };

  const handleDownloadRecent = async (exportRecord) => {
    try {
      const report = await reportService.download(exportRecord);

      if (!report) {
        notify('Unable to download report');
        return;
      }

      const url = URL.createObjectURL(report.blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = report.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);

      notify(`${exportRecord.title} downloaded`);
    } catch (error) {
      console.error('Error downloading report:', error);
      notify('Failed to download report');
    }
  };

  return (
    <Page
      title="Reports"
      subtitle="Turn course evidence into a clear story for your team."
      actions={
        <button
          className="btn btn-primary"
          onClick={handleExport}
          disabled={generating}
        >
          <Download size={14} />
          {generating ? 'Generating…' : 'Export report'}
        </button>
      }
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'minmax(0, 1.1fr) minmax(280px, .9fr)',
          gap: 14,
        }}
      >
        <Card>
          <div className="panel-header">
            <div>
              <div className="panel-title">Build a report</div>
              <div className="panel-kicker">
                Choose the evidence to include
              </div>
            </div>
          </div>

          <div
            style={{
              padding: 20,
              display: 'grid',
              gap: 13,
            }}
          >
            {sections.map((section) => {
              const selected = selectedSections.includes(section.id);

              return (
                <label
                  key={section.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleSection(section.id)}
                  />

                  <span style={{ flex: 1 }}>
                    {section.label}
                  </span>

                  <CheckCircle2
                    size={16}
                    style={{
                      opacity: selected ? 1 : 0.35,
                    }}
                  />
                </label>
              );
            })}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginTop: 4,
              }}
            >
              <select
                className="select"
                value={format}
                onChange={(event) => setFormat(event.target.value)}
              >
                <option>PDF document</option>
                <option>CSV workbook</option>
              </select>

              <button
                className="btn btn-primary"
                onClick={handleSaveTemplate}
              >
                <Check size={14} />
                Save template
              </button>
            </div>
          </div>
        </Card>

        <Card>
          <div className="panel-header">
            <div>
              <div className="panel-title">Recent exports</div>
              <div className="panel-kicker">
                Your generated reports
              </div>
            </div>
          </div>

          <div>
            {recentExports.length === 0 ? (
              <div style={{ padding: 20 }}>
                No reports generated yet.
              </div>
            ) : (
              recentExports.map((exportRecord) => (
                <div
                  className="activity-item"
                  key={exportRecord.id}
                >
                  <FileText size={17} />

                  <div style={{ flex: 1 }}>
                    <div>{exportRecord.title}</div>

                    <div className="panel-kicker">
                      {exportRecord.daysAgo === 0
                        ? 'Just now'
                        : `${exportRecord.daysAgo} day${
                            exportRecord.daysAgo === 1 ? '' : 's'
                          } ago`}
                      {' · '}
                      {exportRecord.format}
                      {' · '}
                      {exportRecord.size}
                    </div>
                  </div>

                  <button
                    className="icon-btn"
                    aria-label={`Download ${exportRecord.title}`}
                    onClick={() =>
                      handleDownloadRecent(exportRecord)
                    }
                  >
                    <Download size={15} />
                  </button>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </Page>
  );
}