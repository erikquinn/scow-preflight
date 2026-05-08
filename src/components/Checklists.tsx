'use client';

import { useState } from 'react';

const checklistData = [
  {
    id: 'checkout',
    title: 'Scot Checkout Checklist',
    description: 'Inspecting the boat, gathering materials, and making log entries as a skipper.',
    items: [
      'Sign out the boat in the Skipper Log',
      'Inspect hull for damage or cracks',
      'Check all required safety gear is present (PFDs, throw cushion, paddle)',
      'Ensure bailers are on board and functional',
      'Check standing rigging (shrouds, forestay) for fraying or loose pins'
    ]
  },
  {
    id: 'launch',
    title: 'Scot Launch Checklist',
    description: 'Getting the boat rigged and in the water.',
    items: [
      'Remove tie-downs and cover',
      'Attach rudder and tiller, ensuring safety pin is secured',
      'Hoist the main sail (ensure boat is head to wind)',
      'Hoist the jib',
      'Prepare dock lines and fenders',
      'Launch the boat off the trailer/hoist safely'
    ]
  },
  {
    id: 'pre-takeoff',
    title: 'Pre-Takeoff Checklist',
    description: 'Final checks before leaving the dock.',
    items: [
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
  // Store the checked state of items in an object: { 'checkout-0': true, 'launch-2': false, ... }
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const toggleItem = (categoryId: string, itemIndex: number) => {
    const key = `${categoryId}-${itemIndex}`;
    setCheckedItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="space-y-8">
      {checklistData.map((category) => {
        // Calculate progress
        const totalItems = category.items.length;
        const checkedCount = category.items.filter((_, index) => checkedItems[`${category.id}-${index}`]).length;
        const isComplete = totalItems === checkedCount;

        return (
          <div key={category.id} className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
            <div className={`p-4 border-b transition-colors duration-300 ${isComplete ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{category.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{category.description}</p>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-semibold px-3 py-1 rounded-full ${isComplete ? 'bg-green-200 text-green-800' : 'bg-slate-200 text-slate-700'}`}>
                    {checkedCount} / {totalItems}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="p-4">
              <ul className="space-y-3">
                {category.items.map((item, index) => {
                  const key = `${category.id}-${index}`;
                  const isChecked = !!checkedItems[key];
                  
                  return (
                    <li key={index} className="flex items-start">
                      <button 
                        className="flex-shrink-0 mt-1 w-6 h-6 rounded border flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                        onClick={() => toggleItem(category.id, index)}
                        aria-checked={isChecked}
                        role="checkbox"
                        style={{
                          backgroundColor: isChecked ? '#1e3a8a' : 'white', // blue-900
                          borderColor: isChecked ? '#1e3a8a' : '#cbd5e1' // slate-300
                        }}
                      >
                        {isChecked && (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <span 
                        className={`ml-3 cursor-pointer select-none transition-all duration-200 ${isChecked ? 'text-slate-400 line-through' : 'text-slate-700'}`}
                        onClick={() => toggleItem(category.id, index)}
                      >
                        {item}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        );
      })}
    </div>
  );
}
