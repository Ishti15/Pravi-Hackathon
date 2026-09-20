import React, { useState, useEffect, useCallback } from 'react';
import PageHeader from '../../components/PageHeader';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import DataTable from '../../components/DataTable';
import { ingestionService } from '../../services/ingestionService';
import { demoService } from '../../services/demoService';
import { DEPARTMENT_CONFIGS } from '../../lib/validation';
import { Upload, Database, RefreshCw, FileText, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export default function DataIngestion() {
  const [department, setDepartment] = useState('Health');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [lastBatchResult, setLastBatchResult] = useState(null);
  const [batches, setBatches] = useState([]);
  const [notification, setNotification] = useState(null);

  const loadBatches = useCallback(async () => {
    try {
      const list = await ingestionService.getBatches();
      setBatches(list || []);
    } catch (err) {
      console.error('Failed to load batches:', err);
    }
  }, []);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setNotification({ type: 'error', message: 'Please select a CSV file to upload.' });
      return;
    }

    setIsUploading(true);
    setNotification(null);

    try {
      const csvText = await file.text();
      const result = await ingestionService.ingestCSV({
        csvText,
        department,
        fileName: file.name
      });

      setLastBatchResult(result.batch);
      setNotification({
        type: 'success',
        message: `Successfully processed ${file.name} for ${department}. ${result.batch.imported_rows} rows imported.`
      });
      setFile(null);
      // Reset file input element
      const fileInput = document.getElementById('csv-file-input');
      if (fileInput) fileInput.value = '';
      await loadBatches();
    } catch (err) {
      console.error('Ingestion error:', err);
      setNotification({ type: 'error', message: `Ingestion failed: ${err.message}` });
    } finally {
      setIsUploading(false);
    }
  };

  const handleLoadDemo = async () => {
    if (!window.confirm('This will load all 5 department datasets (Health, Education, Food, Labour, Housing). Continue?')) {
      return;
    }

    setIsDemoLoading(true);
    setNotification(null);

    try {
      const results = await ingestionService.loadDemoDataset();
      const totalImported = results.reduce((acc, r) => acc + r.batch.imported_rows, 0);
      setLastBatchResult(results[results.length - 1].batch);
      setNotification({
        type: 'success',
        message: `Demo dataset loaded successfully! 5 files ingested, ${totalImported} total records staged.`
      });
      await loadBatches();
    } catch (err) {
      console.error('Demo load error:', err);
      setNotification({ type: 'error', message: `Failed to load demo dataset: ${err.message}` });
    } finally {
      setIsDemoLoading(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Are you sure you want to reset all synthetic demo data? This will clear all staged records, persons, families, and audit logs.')) {
      return;
    }

    setIsResetting(true);
    try {
      await demoService.resetDemoData();
      setLastBatchResult(null);
      setBatches([]);
      setNotification({ type: 'info', message: 'System data has been completely reset.' });
    } catch (err) {
      console.error('Reset error:', err);
      setNotification({ type: 'error', message: `Reset failed: ${err.message}` });
    } finally {
      setIsResetting(false);
    }
  };

  const historyColumns = [
    { label: 'Batch ID', render: (r) => <span className="font-mono text-xs text-gray-600">{r.batch_id.slice(0, 8)}...</span> },
    { label: 'Department', field: 'department', render: (r) => <span className="font-semibold text-primary">{r.department}</span> },
    { label: 'File Name', field: 'file_name' },
    { label: 'Total Rows', field: 'total_rows', render: (r) => <span className="font-mono">{r.total_rows}</span> },
    { 
      label: 'Imported', 
      render: (r) => (
        <span className="inline-flex items-center text-emerald-700 font-semibold font-mono">
          {r.imported_rows}
        </span>
      )
    },
    { 
      label: 'Errors / Dups', 
      render: (r) => (
        <span className="font-mono text-xs">
          {r.error_rows > 0 && <span className="text-red-600 font-semibold mr-2">{r.error_rows} err</span>}
          {r.duplicates_in_file > 0 && <span className="text-amber-600 font-medium">{r.duplicates_in_file} dup</span>}
          {r.error_rows === 0 && r.duplicates_in_file === 0 && <span className="text-gray-400">0</span>}
        </span>
      )
    },
    {
      label: 'Uploaded At',
      render: (r) => (
        <span className="text-xs text-gray-500">
          {new Date(r.uploaded_at).toLocaleString()}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <PageHeader
        title="Department Data Ingestion"
        description="Upload department CSV records to validate, stage, and prepare for family beneficiary reconciliation."
        action={
          <div className="flex items-center gap-3">
            <button
              onClick={handleLoadDemo}
              disabled={isDemoLoading || isUploading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
            >
              <Database size={16} />
              {isDemoLoading ? 'Loading Demo Data...' : 'Load Demo Dataset'}
            </button>
            <button
              onClick={handleReset}
              disabled={isResetting || isUploading || isDemoLoading}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors border border-gray-300 disabled:opacity-50"
            >
              <RefreshCw size={16} className={isResetting ? 'animate-spin' : ''} />
              {isResetting ? 'Resetting...' : 'Reset Demo Data'}
            </button>
          </div>
        }
      />

      {notification && (
        <div className={`p-4 rounded-xl border text-sm font-medium flex items-center gap-3 ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : notification.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          {notification.type === 'success' && <CheckCircle size={18} className="text-emerald-600 flex-shrink-0" />}
          {notification.type === 'error' && <AlertTriangle size={18} className="text-red-600 flex-shrink-0" />}
          {notification.type === 'info' && <Clock size={18} className="text-blue-600 flex-shrink-0" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Upload Box & Department Selector */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Upload size={20} className="text-primary" /> Upload Department CSV
        </h3>

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Select Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary focus:border-primary p-2.5 font-medium"
              >
                {Object.keys(DEPARTMENT_CONFIGS).map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1.5">
                Expected columns: <code className="text-primary font-mono text-[11px]">{DEPARTMENT_CONFIGS[department]?.expectedCols.join(', ')}</code>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                Choose CSV File
              </label>
              <input
                id="csv-file-input"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90 cursor-pointer bg-gray-50 rounded-lg border border-gray-300"
              />
              <p className="text-xs text-gray-500 mt-1.5">
                UTF-8 encoded standard CSV format.
              </p>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={!file || isUploading}
              className="px-6 py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Upload size={18} />
              {isUploading ? 'Validating & Ingesting...' : 'Upload & Ingest'}
            </button>
          </div>
        </form>
      </div>

      {/* Latest Batch Result Summary */}
      {lastBatchResult && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Ingestion Batch Summary</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Batch ID: <span className="font-mono text-gray-700">{lastBatchResult.batch_id}</span> | Department: <span className="font-semibold text-primary">{lastBatchResult.department}</span>
              </p>
            </div>
            <StatusBadge status={lastBatchResult.error_rows === 0 ? 'APPROVED' : 'POTENTIALLY_ELIGIBLE'} text={lastBatchResult.error_rows === 0 ? 'COMPLETED' : 'PROCESSED WITH ERRORS'} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            <StatCard title="Total Rows" value={lastBatchResult.total_rows} color="blue" />
            <StatCard title="Imported Rows" value={lastBatchResult.imported_rows} color="green" />
            <StatCard title="Invalid / Bad Rows" value={lastBatchResult.error_rows} color="red" />
            <StatCard title="Duplicates Skipped" value={lastBatchResult.duplicates_in_file} color="amber" />
            <StatCard title="Linked Records" value={lastBatchResult.linked_records} color="blue" />
            <StatCard title="Review Queued" value={lastBatchResult.review_queued} color="amber" />
          </div>

          {lastBatchResult.errors && lastBatchResult.errors.length > 0 && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg space-y-2">
              <h4 className="text-sm font-bold text-red-900 flex items-center gap-1.5">
                <AlertTriangle size={16} className="text-red-700" />
                Validation Errors ({lastBatchResult.errors.length} rows skipped)
              </h4>
              <div className="max-h-40 overflow-y-auto divide-y divide-red-100 text-xs text-red-800">
                {lastBatchResult.errors.map((err, idx) => (
                  <div key={idx} className="py-1.5 flex gap-2">
                    <span className="font-bold text-red-950 font-mono">Row {err.rowNumber}:</span>
                    <span>{err.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ingestion Batches History Table */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <FileText size={20} className="text-primary" /> Ingestion History
        </h3>
        <DataTable
          columns={historyColumns}
          data={batches}
          keyField="batch_id"
          emptyMessage="No department data ingested yet. Upload a CSV file or click 'Load Demo Dataset'."
        />
      </div>
    </div>
  );
}
