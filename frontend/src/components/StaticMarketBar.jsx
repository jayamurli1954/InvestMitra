import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const StaticMarketBar = ({ indices = [] }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Only show top 3-4 indices initially
  const keyIndices = indices.slice(0, 4);
  const additionalIndices = indices.slice(4);

  return (
    <div className="bg-slate-900 text-white border-b border-slate-700">
      {/* Main bar - always visible */}
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-6 flex-wrap">
            {keyIndices.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="font-semibold text-sm">{item.name}</span>
                <span className="text-sm">{item.value.toFixed(2)}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  item.change >= 0
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)} ({item.change_percent.toFixed(2)}%)
                </span>
              </div>
            ))}
          </div>

          {additionalIndices.length > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <span>{isExpanded ? 'Less' : 'More indices'}</span>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Expandable section */}
      {isExpanded && additionalIndices.length > 0 && (
        <div className="container mx-auto px-4 pb-3 pt-1 border-t border-slate-700/50">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {additionalIndices.map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <span className="font-medium text-slate-300">{item.name}:</span>
                <span className="text-slate-200">{item.value.toFixed(2)}</span>
                <span className={`text-xs ${
                  item.change >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {item.change >= 0 ? '+' : ''}{item.change_percent.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

<<<<<<< HEAD
export default StaticMarketBar;
=======
export default StaticMarketBar;
>>>>>>> 196e3d74d7f950b7a20b5e5601c8c8aee9923568
