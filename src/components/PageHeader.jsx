import React from 'react';
export default function PageHeader({ title, description, action }) {
  return (
    <div className="mb-6 flex justify-between items-start">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h1>
        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
