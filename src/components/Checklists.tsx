'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, RotateCcw, CheckSquare } from 'lucide-react';

const checklistData = [
  {
    id: 'checkout',
    title: 'Pre-trip & Dock Check',
    description: 'Planning, gear, and boat inspection before heading to the crane.',
    items: [
      'Multitool',
      'Review wind, tides, rain, cold water, and other hazards',
      'Go/no-go decision',
      'Fill out log; get items from locker',
      'Check hull and rigging',
      'Onboard gear: bailer, paddle, 6 lifejackets, throwable flotation, throwable lifeline, boat hook, safety kit and radio, anchor',
      'Confirm crew experience and swimming ability',
    ]
  },
  {
    id: 'launch',
    title: 'Launch & Rig',
    description: 'Getting the boat rigged and in the water.',
    items: [
      'Lift bridle secure (double-check)',
      'Mini brief: stay on the boat, never between dock and boat',
      'Lower boat with crane',
      'Rudder down, moving freely',
      'Lower centerboard',
      'Mainsail dropped to port side',
      'Raise jib, all hanks attached',
    ]
  },
  {
    id: 'before-takeoff',
    title: 'Safety Brief & Departure',
    description: 'Final safety briefing and checks before leaving the dock.',
    items: [
      'Recheck weather conditions',
      'PFD check',
      'Radio on',
      'Sail plan',
      'Wingtip vortices',
      'Capsize: account for crew, uncleat everything, two crew at centerboard and one keeps head to wind, float under top of mast',
      'Run aground: stay on the boat',
    ]
  },
  {
    id: 'after-landing',
    title: 'De-rig',
    description: 'Preparations before hoisting the boat out at the crane.',
    items: [
      'Mainsail dropped to starboard side',
    ]
  },
  {
    id: 'shutdown',
    title: 'Recovery & Shutdown',
    description: 'Pulling the boat out, cleaning up, and returning gear.',
    items: [
      'Pull boat out of water',
      'Spray down',
      'Tidy',
      'Cover boat',
      'Return items to locker',
    ]
  }
];

export default function Checklists() {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    checkout: false,
    launch: false,
    'pre-takeoff': false,
    'after-landing': false,
    shutdown: false,
  });
  const [isMounted, setIsMounted] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem('scow-checklists-state');
    if (saved) {
      try {
        setCheckedItems(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse checklist state");
      }
    }
  }, []);

  // Save to local storage whenever checked items change
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('scow-checklists-state', JSON.stringify(checkedItems));
    }
  }, [checkedItems, isMounted]);

  const toggleItem = (categoryId: string, itemIndex: number) => {
    const key = `${categoryId}-${itemIndex}`;
    setCheckedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }));
  };

  const checkAllInCategory = (e: React.MouseEvent, categoryId: string, itemsLength: number) => {
    e.stopPropagation(); // prevent collapsing the category
    setCheckedItems(prev => {
      const next = { ...prev };
      for (let i = 0; i < itemsLength; i++) {
        next[`${categoryId}-${i}`] = true;
      }
      return next;
    });
  };

  const resetChecklists = () => {
    if (window.confirm('Are you sure you want to uncheck all items?')) {
      setCheckedItems({});
    }
  };

  if (!isMounted) return null; // Avoid hydration mismatch

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-4">
        <button
          onClick={resetChecklists}
          className="flex items-center gap-2 text-sm font-semibold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 py-2 px-4 rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          Reset All Checklists
        </button>
      </div>

      <div className="space-y-6">
        {checklistData.map((category) => {
          // Calculate progress
          const totalItems = category.items.length;
          const checkedCount = category.items.filter((_, index) => checkedItems[`${category.id}-${index}`]).length;
          const isComplete = totalItems === checkedCount;
          const isExpanded = expandedCategories[category.id];

          return (
            <div key={category.id} className={`rounded-xl shadow-md border overflow-hidden transition-all duration-300 ${isComplete ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-800' : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800'}`}>
              <div
                className={`p-4 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors duration-300 flex justify-between items-center ${isComplete ? 'border-b border-green-300/50 dark:border-green-800/50' : 'border-b border-slate-200 dark:border-slate-700'}`}
                onClick={() => toggleCategory(category.id)}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-full ${isComplete ? 'bg-green-200 dark:bg-green-800/60 text-green-700 dark:text-green-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className={`text-xl font-bold ${isComplete ? 'text-green-900 dark:text-green-100' : 'text-slate-900 dark:text-slate-100'}`}>{category.title}</h3>
                    <p className={`text-sm mt-1 font-medium ${isComplete ? 'text-green-700 dark:text-green-400' : 'text-slate-600 dark:text-slate-400'}`}>{category.description}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-4 flex items-center gap-3">
                  {!isComplete && (
                    <button
                      onClick={(e) => checkAllInCategory(e, category.id, totalItems)}
                      className="text-xs flex items-center gap-1.5 font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 px-3 py-1.5 rounded-full transition-colors shadow-sm"
                      title="Check all items"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      Check All
                    </button>
                  )}
                  <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${isComplete ? 'bg-green-500 dark:bg-green-600 text-white shadow-sm' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-300'}`}>
                    {checkedCount} / {totalItems}
                  </span>
                </div>
              </div>

              {isExpanded && (
                <div className="p-5">
                  <ul className="space-y-4">
                    {category.items.map((item, index) => {
                      const key = `${category.id}-${index}`;
                      const isChecked = !!checkedItems[key];

                      return (
                        <li key={index} className="flex items-start">
                          <button
                            className="flex-shrink-0 mt-1 w-7 h-7 rounded border-2 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors shadow-sm"
                            onClick={() => toggleItem(category.id, index)}
                            aria-checked={isChecked}
                            role="checkbox"
                            style={{
                              backgroundColor: isChecked ? (isComplete ? '#166534' : '#1e3a8a') : 'transparent', // green-800 : blue-900
                              borderColor: isChecked ? (isComplete ? '#166534' : '#1e3a8a') : '#475569' // green-800 : blue-900 : slate-600
                            }}
                          >
                            {isChecked && (
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                          <span
                            className={`ml-4 cursor-pointer select-none transition-all duration-200 text-lg ${isChecked ? 'text-slate-400 dark:text-slate-500 line-through italic' : (isComplete ? 'text-green-900 dark:text-green-100 font-medium' : 'text-slate-800 dark:text-slate-100 font-medium')}`}
                            onClick={() => toggleItem(category.id, index)}
                          >
                            {item}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
