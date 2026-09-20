import React, { useRef } from 'react';
import { CheckCircle2, Circle, Upload, FileText, Trash2, AlertCircle } from 'lucide-react';

/**
 * RequirementsChecklist Component
 * Renders user inputs for required information and mock file uploads for required documents.
 */
export default function RequirementsChecklist({
  scheme,
  formData = {},
  onFormDataChange = () => {},
  documents = [],
  onDocumentsChange = () => {},
  readOnly = false
}) {
  const fileInputRefs = useRef({});

  const requiredInfo = scheme?.required_information || [];
  const requiredDocs = scheme?.required_documents || [];

  const handleInputChange = (key, value) => {
    onFormDataChange({
      ...formData,
      [key]: value
    });
  };

  const handleFileUpload = (docKey, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Filter out existing doc for this key if re-uploading
    const updatedDocs = documents.filter(d => (d.doc_type || d.key) !== docKey);
    updatedDocs.push({
      doc_id: crypto.randomUUID(),
      doc_type: docKey,
      file_name: file.name,
      file_size: file.size,
      uploaded_at: new Date().toISOString()
    });

    onDocumentsChange(updatedDocs);
  };

  const handleRemoveDocument = (docKey) => {
    onDocumentsChange(documents.filter(d => (d.doc_type || d.key) !== docKey));
  };

  const totalItems = requiredInfo.length + requiredDocs.length;
  let fulfilledItems = 0;

  requiredInfo.forEach(info => {
    if (formData[info.key] && String(formData[info.key]).trim()) fulfilledItems++;
  });

  requiredDocs.forEach(doc => {
    if (documents.some(d => (d.doc_type || d.key) === doc.key)) fulfilledItems++;
  });

  const isAllComplete = totalItems === 0 || fulfilledItems === totalItems;

  return (
    <div className="space-y-6">
      {/* Progress header */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${isAllComplete ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
            {isAllComplete ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-800">
              Requirements Checklist ({fulfilledItems}/{totalItems} Completed)
            </h4>
            <p className="text-xs text-slate-500">
              {isAllComplete 
                ? 'All required details and documents have been provided.' 
                : 'Please provide the missing details below to enable submission.'}
            </p>
          </div>
        </div>
        <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600">
          {totalItems === 0 ? 'None Required' : `${Math.round((fulfilledItems / totalItems) * 100)}% Ready`}
        </div>
      </div>

      {/* 1. Required Information Fields */}
      {requiredInfo.length > 0 && (
        <div className="space-y-3">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Required Information ({requiredInfo.length})
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {requiredInfo.map(info => {
              const val = formData[info.key] || '';
              const isFilled = Boolean(val && String(val).trim());

              return (
                <div key={info.key} className="p-3 border rounded-lg bg-white border-slate-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      {isFilled ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-slate-400 inline" />
                      )}
                      {info.label || info.key} <span className="text-red-500">*</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    disabled={readOnly}
                    value={val}
                    onChange={(e) => handleInputChange(info.key, e.target.value)}
                    placeholder={`Enter ${info.label || info.key}`}
                    className="w-full text-xs px-3 py-2 border rounded border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Required Documents Upload */}
      {requiredDocs.length > 0 && (
        <div className="space-y-3">
          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Required Documents ({requiredDocs.length})
          </h5>
          <div className="space-y-2">
            {requiredDocs.map(doc => {
              const attached = documents.find(d => (d.doc_type || d.key) === doc.key);

              return (
                <div 
                  key={doc.key} 
                  className={`p-3.5 border rounded-lg flex items-center justify-between transition-colors ${
                    attached ? 'bg-emerald-50/50 border-emerald-200' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {attached ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-400 shrink-0" />
                    )}
                    <div>
                      <div className="text-xs font-semibold text-slate-800">
                        {doc.label || doc.key} <span className="text-red-500">*</span>
                      </div>
                      {attached ? (
                        <div className="text-[11px] text-emerald-700 flex items-center gap-1 mt-0.5">
                          <FileText className="w-3 h-3" />
                          <span>{attached.file_name} ({(attached.file_size / 1024).toFixed(0)} KB)</span>
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-500">
                          Upload PDF or scanned copy (mock attachment)
                        </div>
                      )}
                    </div>
                  </div>

                  {!readOnly && (
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={el => fileInputRefs.current[doc.key] = el}
                        className="hidden"
                        onChange={(e) => handleFileUpload(doc.key, e)}
                        accept=".pdf,.jpg,.jpeg,.png"
                      />
                      {attached ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveDocument(doc.key)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Remove document"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileInputRefs.current[doc.key]?.click()}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors shadow-sm"
                        >
                          <Upload className="w-3.5 h-3.5 text-slate-500" />
                          <span>Attach</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
