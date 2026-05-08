'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function CollapsibleWindLimits() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mt-8 bg-blue-50 dark:bg-slate-800/40 rounded-xl border border-blue-100 dark:border-slate-700/60 overflow-hidden shadow-sm">
      <div
        className="px-5 py-3 bg-blue-100/50 dark:bg-slate-900/50 border-b border-blue-100 dark:border-slate-700/60 flex justify-between items-center cursor-pointer hover:bg-blue-100/70 dark:hover:bg-slate-800/60 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h4 className="font-bold text-blue-900 dark:text-slate-200 uppercase tracking-wide text-sm">SCOW Wind Limits (SSRBUP)</h4>
        <div className="text-blue-700 dark:text-slate-400">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {isExpanded && (
        <div className="p-0 overflow-hidden transition-all duration-300">
          <table className="w-full text-left border-collapse text-sm">
            <tbody className="divide-y divide-blue-100 dark:divide-slate-700/50">
              <tr className="hover:bg-blue-50/50 dark:hover:bg-slate-800/40 transition-colors">
                <td className="py-3 pl-5 pr-3 w-32 align-top sm:align-middle">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0 bg-blue-400 border border-blue-500 shadow-sm"></div>
                    <span className="font-bold text-blue-900 dark:text-slate-200 whitespace-nowrap">&lt; 5 kts</span>
                  </div>
                </td>
                <td className="py-3 px-3 w-24 text-xs font-semibold text-slate-500 dark:text-slate-400 align-top sm:align-middle hidden sm:table-cell">
                  (&lt; 6 mph)
                </td>
                <td className="py-3 pr-5 pl-3 text-slate-700 dark:text-slate-300 font-medium text-xs">
                  Weak Wind (consider whether a falling tide makes it risky to go out!)
                </td>
              </tr>
              <tr className="hover:bg-blue-50/50 dark:hover:bg-slate-800/40 transition-colors">
                <td className="py-3 pl-5 pr-3 w-32 align-top sm:align-middle">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0 bg-green-400 border border-green-500 shadow-sm"></div>
                    <span className="font-bold text-blue-900 dark:text-slate-200 whitespace-nowrap">5 - 14 kts</span>
                  </div>
                </td>
                <td className="py-3 px-3 w-24 text-xs font-semibold text-slate-500 dark:text-slate-400 align-top sm:align-middle hidden sm:table-cell">
                  (6 - 16 mph)
                </td>
                <td className="py-3 pr-5 pl-3 text-slate-700 dark:text-slate-300 font-medium">
                  Optimal Sailing Conditions ⛵
                </td>
              </tr>
              <tr className="hover:bg-blue-50/50 dark:hover:bg-slate-800/40 transition-colors">
                <td className="py-3 pl-5 pr-3 w-32 align-top">
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="w-3 h-3 rounded-full shrink-0 bg-yellow-400 border border-yellow-500 shadow-sm"></div>
                    <span className="font-bold text-blue-900 dark:text-slate-200 whitespace-nowrap">15 - 19 kts</span>
                  </div>
                </td>
                <td className="py-3 px-3 w-24 text-xs font-semibold text-slate-500 dark:text-slate-400 align-top hidden sm:table-cell pt-3.5">
                  (17 - 23 mph)
                </td>
                <td className="py-3 pr-5 pl-3 text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                  Flying Scots <strong className="text-yellow-700 dark:text-yellow-500">MUST reef</strong>, remain in lagoon, <strong className="text-yellow-700 dark:text-yellow-500">ALL aboard wear PFDs</strong>.<br className="hidden sm:block" />
                  <span className="text-slate-500 dark:text-slate-400 text-xs mt-1 block sm:inline sm:mt-0 sm:ml-1">
                    Social Sail: max 5 people, incl. 2nd skipper/exp crew.
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-blue-50/50 dark:hover:bg-slate-800/40 transition-colors">
                <td className="py-3 pl-5 pr-3 w-32 align-top sm:align-middle">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0 bg-red-500 border border-red-600 shadow-sm"></div>
                    <span className="font-bold text-blue-900 dark:text-slate-200 whitespace-nowrap">20 - 24 kts</span>
                  </div>
                </td>
                <td className="py-3 px-3 w-24 text-xs font-semibold text-slate-500 dark:text-slate-400 align-top sm:align-middle hidden sm:table-cell">
                  (23 - 29 mph)
                </td>
                <td className="py-3 pr-5 pl-3 text-slate-700 dark:text-slate-300 font-medium">
                  Flying Scots Prohibited
                </td>
              </tr>
              <tr className="hover:bg-blue-50/50 dark:hover:bg-slate-800/40 transition-colors">
                <td className="py-3 pl-5 pr-3 w-32 align-top sm:align-middle">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0 bg-slate-800 border border-slate-900 dark:bg-black dark:border-black shadow-sm"></div>
                    <span className="font-bold text-blue-900 dark:text-slate-200 whitespace-nowrap">≥ 25 kts</span>
                  </div>
                </td>
                <td className="py-3 px-3 w-24 text-xs font-semibold text-slate-500 dark:text-slate-400 align-top sm:align-middle hidden sm:table-cell">
                  (≥ 29 mph)
                </td>
                <td className="py-3 pr-5 pl-3 text-slate-700 dark:text-slate-300 font-medium">
                  All Boats Prohibited
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
