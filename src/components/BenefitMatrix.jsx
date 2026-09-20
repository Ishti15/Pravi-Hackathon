import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MATRIX_CELL_STATES } from '../lib/benefitMatrix';
import ReasonList from './ReasonList';
import ApplicationRouteChip from './ApplicationRouteChip';
import {
  Users,
  Home,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Info,
  X,
  Sparkles,
  FileQuestion,
  Layers
} from 'lucide-react';

export default function BenefitMatrix({ matrixData }) {
  const [selectedCell, setSelectedCell] = useState(null);

  if (!matrixData || !matrixData.rows || matrixData.rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
        <Layers className="mx-auto text-gray-400 mb-2" size={32} />
        <p className="font-medium text-gray-700">No Benefit Matrix data available</p>
        <p className="text-xs text-gray-400 mt-1">Reconcile the family or run eligibility evaluation to view the matrix.</p>
      </div>
    );
  }

  const { rows, columns, cells, family } = matrixData;

  const renderCellBadge = (cell) => {
    if (!cell || cell.state === MATRIX_CELL_STATES.NA) {
      return (
        <span className="text-gray-300 font-mono text-xs select-none" title="Not Applicable for this scope">
          —
        </span>
      );
    }

    let badgeClass = 'bg-gray-100 text-gray-600 border-gray-200';
    let icon = null;

    switch (cell.state) {
      case MATRIX_CELL_STATES.ENROLLED:
        badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 font-semibold';
        icon = <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />;
        break;
      case MATRIX_CELL_STATES.RENEWAL_DUE:
        badgeClass = 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200 font-bold animate-pulse';
        icon = <Clock size={12} className="text-amber-700 shrink-0" />;
        break;
      case MATRIX_CELL_STATES.GAP:
        badgeClass = 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 font-bold';
        icon = <Sparkles size={12} className="text-amber-600 shrink-0" />;
        break;
      case MATRIX_CELL_STATES.IN_PROGRESS:
        badgeClass = 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100 font-semibold';
        icon = <Clock size={12} className="text-blue-600 shrink-0" />;
        break;
      case MATRIX_CELL_STATES.POTENTIAL:
        badgeClass = 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 font-medium';
        icon = <FileQuestion size={12} className="text-indigo-600 shrink-0" />;
        break;
      case MATRIX_CELL_STATES.NOT_ELIGIBLE:
      default:
        badgeClass = 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100';
        icon = null;
        break;
    }

    return (
      <button
        type="button"
        onClick={() => setSelectedCell(cell)}
        className={`w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-2xs border transition-all shadow-3xs cursor-pointer ${badgeClass}`}
      >
        {icon}
        <span className="truncate">{cell.label}</span>
      </button>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Table Header Summary */}
      <div className="p-4 border-b border-gray-200 bg-gray-50/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-900 text-base">Family Benefit Matrix</h3>
            <span className="text-3xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              Live Evaluation
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Single view linking all family members to state schemes, active enrollments, and benefit gaps.
          </p>
        </div>
        
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 text-3xs font-medium">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Enrolled
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Benefit Gap
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> In Progress
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Potential
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-50 text-gray-500 border border-gray-200">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span> Not Eligible
          </span>
        </div>
      </div>

      {/* Grid Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-gray-100/75 border-b border-gray-200 text-2xs font-bold uppercase text-gray-600 tracking-wider">
              <th className="py-3 px-4 w-52 sticky left-0 bg-gray-100/95 z-10 shadow-[1px_0_3px_rgba(0,0,0,0.05)]">
                Subject / Member
              </th>
              {columns.map(col => (
                <th key={col.scheme_code} className="py-3 px-3 text-center min-w-[140px] border-l border-gray-200/80">
                  <div className="font-bold text-gray-900 text-xs">{col.name}</div>
                  <div className="flex items-center justify-center gap-1.5 mt-1 font-mono text-3xs font-normal">
                    <span className="text-gray-500">{col.scheme_code}</span>
                    <span className={`px-1.5 py-0.2 rounded text-3xs font-bold ${
                      col.scope === 'FAMILY' ? 'bg-purple-100 text-purple-700' : 'bg-cyan-100 text-cyan-700'
                    }`}>
                      {col.scope}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-xs">
            {rows.map((row) => (
              <tr 
                key={row.id} 
                className={row.isFamilyRow ? 'bg-primary/5 font-medium' : 'hover:bg-gray-50/60 transition-colors'}
              >
                {/* Row Header */}
                <td className={`py-3 px-4 sticky left-0 z-10 shadow-[1px_0_3px_rgba(0,0,0,0.05)] ${
                  row.isFamilyRow ? 'bg-[#f4f7fb]' : 'bg-white'
                }`}>
                  <div className="flex items-center gap-2">
                    {row.isFamilyRow ? (
                      <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Home size={15} />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
                        <Users size={15} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 text-xs truncate">
                        {row.name}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-3xs px-1.5 py-0.2 rounded bg-gray-100 text-gray-600 font-medium">
                          {row.relationship}
                        </span>
                        {row.gender && (
                          <span className="text-3xs text-gray-400">
                            {row.gender === 'M' ? 'Male' : 'Female'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Scheme Columns */}
                {columns.map(col => {
                  const cellKey = `${row.id}_${col.scheme_code}`;
                  const cell = cells[cellKey];
                  return (
                    <td key={col.scheme_code} className="py-2.5 px-3 text-center border-l border-gray-200/80">
                      {renderCellBadge(cell)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cell Detail Modal */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-primary to-[#2a4d7d] p-5 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xs font-mono bg-white/20 px-2 py-0.5 rounded font-bold">
                    {selectedCell.schemeCode}
                  </span>
                  <span className="text-xs font-semibold text-accent-light">
                    {selectedCell.label}
                  </span>
                </div>
                <h4 className="text-base font-bold text-white mt-1">
                  Scheme Eligibility & Route Details
                </h4>
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Application Route Header */}
              {selectedCell.routeInfo && selectedCell.routeInfo.route !== 'NONE' && (
                <div className="bg-blue-50/60 rounded-xl p-3.5 border border-blue-200 flex items-center justify-between">
                  <div>
                    <span className="text-2xs text-gray-500 font-medium block">Actionable Application Route</span>
                    <span className="font-bold text-gray-900 text-sm">{selectedCell.routeInfo.label}</span>
                  </div>
                  <ApplicationRouteChip route={selectedCell.routeInfo.route} size="md" />
                </div>
              )}

              {/* Evaluation Reasons */}
              <div>
                <h5 className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-2 flex items-center gap-1.5">
                  <Info size={14} className="text-primary" /> Evaluation Reasons
                </h5>
                <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200">
                  <ReasonList reasons={selectedCell.reasons} />
                </div>
              </div>

              {/* Missing Information / Requirements */}
              {selectedCell.missingInfo && selectedCell.missingInfo.length > 0 && (
                <div>
                  <h5 className="text-xs font-bold uppercase text-amber-700 tracking-wider mb-2 flex items-center gap-1.5">
                    <AlertCircle size={14} className="text-amber-600" /> Information Needed
                  </h5>
                  <div className="bg-amber-50/70 rounded-xl p-3.5 border border-amber-200">
                    <ul className="space-y-1.5 text-xs text-amber-900">
                      {selectedCell.missingInfo.map((info, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></span>
                          <span>{info}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* External Portal Info */}
              {selectedCell.routeInfo?.officialUrl && (
                <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-200">
                  <span className="text-2xs text-gray-500 font-medium block">External Referral URL</span>
                  <a
                    href={selectedCell.routeInfo.officialUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline mt-1"
                  >
                    {selectedCell.routeInfo.officialUrl} <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <div>
                {selectedCell.routeInfo && selectedCell.routeInfo.route !== 'NONE' && (
                  <Link
                    to={`/citizen/apply/${selectedCell.schemeCode}`}
                    onClick={() => setSelectedCell(null)}
                    className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition-colors inline-flex items-center gap-1.5 shadow-sm"
                  >
                    <span>Apply for Scheme</span>
                    <ExternalLink size={12} />
                  </Link>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 text-xs font-semibold hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
