'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';

const checklistData = [
  {
    id: 'checkout',
    title: 'Scot Checkout Checklist',
    description: 'Inspecting the boat, gathering materials, and making log entries as a skipper.',
    items: [
      'Review weather conditions and assess sailing outlook',
      'Review notes from previous skipper checkouts for any maintenance issues',
      'Check out the boat from the skipper log, including wx and crew information',
      'If any crew are non-SCOW members, ensure a signed waiver is on file',
      'Bring Safety Kit, spinnaker bag/pole, two winch cranks, and boating safety certificate to the boat',
      'Inspect and remove the tie-downs and cover',
      'Inspect hull, stays, and rigging (check for loose pins/fraying)',
      'Drain boat, and reinsert drain plug (tail up)',
      'Secure lifting bridle and proceed to hoist'
    ]
  },
  {
    id: 'launch',
    title: 'Scot Launch Checklist',
    description: 'Getting the boat rigged and in the water.',
    items: [
      'Select a crane whose arm is pointing to windward (plan to utilize the dock to windward)',
      'Ensure lifting bridle is properly secured and not fouled',
      'Attach and tension crane hook, then remove belly band and bow hook',
      'Communicate the procedure with crew, then lift and pivot the boat, to lower the rudder',
      'Lower the boat into the water, walk it to the windward dock, and tie off'
    ]
  },
  {
    id: 'before-takeoff',
    title: 'Before Takeoff Checklist',
    description: 'Final checks before leaving the dock.',
    items: [
      '***STILL PLACEHOLDER CONTENT HEREAFTER - REVIEW LATER***',
      'Hoist the main sail (ensure boat is head to wind)',
      'Hoist the jib',
      'Gather required safety equipment (PFDs, throw cushion, paddle, bailer, whistle, flashlight)',
      'Centerboard lowered as needed for depth',
      'Rudder fully down and cleated',
      'Mainsheet and jib sheets run free with figure-8 knots',
      'Check wind direction and plan departure angle',
      'Crew briefed on their roles and safety procedures',
      'Cast off bow and stern lines'
    ]
  },
  {
    id: 'after-landing',
    title: 'After Landing Checklist',
    description: 'Preparations before hoisting boat out of water at the hoist.',
    items: [
      'Secure boat to dock with bow, stern, and spring lines',
      'Lower main and jib sails',
      'Furl or flake sails securely',
      'Raise centerboard completely',
      'Raise rudder or remove it entirely before approaching hoist'
    ]
  },
  {
    id: 'shutdown',
    title: 'Shutdown Checklist',
    description: 'Securing boat to the trailer after hoisting it out, putting it away, and closing skipper checkout log.',
    items: [
      'Ensure boat is sitting securely and level on the trailer',
      'Attach all tie-down straps tightly',
      'Stow sails, rudder, and tiller safely inside or in designated storage',
      'Install the boat cover securely to prevent water pooling',
      'Complete the Skipper Log entry, noting any maintenance issues'
    ]
  }
];

export default function Checklists() {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    checkout: true,
    launch: true,
    'pre-takeoff': true,
    'after-landing': true,
    shutdown: true,
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
                <div className="text-right shrink-0 ml-4">
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
