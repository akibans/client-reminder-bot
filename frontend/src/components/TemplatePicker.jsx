import { useState, useEffect, useRef } from 'react';
import { templateApi } from '../services/templateApi';
import TemplateManager from './TemplateManager';

export default function TemplatePicker({ onSelect, clientData = {} }) {
  const [templates, setTemplates] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const { data } = await templateApi.getAll();
      if (data.success) setTemplates(data.data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (template) => {
    // Auto-replace variables with client data
    let processedContent = template.content;
    
    Object.entries(clientData).forEach(([key, value]) => {
      if (value) {
        processedContent = processedContent.replace(
          new RegExp(`\\{\\{${key}\\}\\}`, 'gi'), 
          value
        );
      }
    });

    onSelect({
      ...template,
      processedContent,
      originalContent: template.content
    });
    
    setIsOpen(false);
  };

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Count unreplaced variables in a template
  const getUnreplacedVars = (template) => {
    const vars = template.variables || [];
    return vars.filter(v => !clientData[v]);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-all shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span>Use Template</span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-fade-in right-0">
          <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
            <h4 className="font-bold text-gray-800">Message Templates</h4>
            <p className="text-xs text-gray-500 mt-1">
              Select a template or create new
            </p>
          </div>
          
          <div className="p-2">
            <input
              type="text"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
                <p className="text-gray-500 text-sm mt-2">Loading templates...</p>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="p-8 text-center">
                <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500 text-sm">No templates found</p>
              </div>
            ) : (
              filteredTemplates.map((template) => {
                const unreplacedVars = getUnreplacedVars(template);
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => handleSelect(template)}
                    className="w-full text-left p-3 hover:bg-indigo-50 transition-all border-b border-gray-50 last:border-0 group"
                  >
                    <div className="flex justify-between items-start">
                      <div className="font-semibold text-gray-800 text-sm group-hover:text-indigo-700">
                        {template.name}
                      </div>
                      {template.variables?.length > 0 && (
                        <span className="flex items-center gap-1 text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                          </svg>
                          {template.variables.length}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 truncate mt-1">
                      {template.content.substring(0, 60)}...
                    </div>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {template.variables?.slice(0, 3).map(v => (
                        <span 
                          key={v} 
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            clientData[v] 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {`{{${v}}}`}
                        </span>
                      ))}
                      {template.variables?.length > 3 && (
                        <span className="text-[10px] text-gray-400">+{template.variables.length - 3}</span>
                      )}
                    </div>
                    {unreplacedVars.length > 0 && (
                      <div className="text-[10px] text-amber-600 mt-1">
                        {unreplacedVars.length} variable(s) need manual entry
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
          
          <div className="p-3 border-t border-gray-100 bg-gray-50">
            <button
              type="button"
              onClick={() => { setShowManager(true); setIsOpen(false); }}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-indigo-600 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Manage Templates
            </button>
          </div>
        </div>
      )}

      {showManager && (
        <TemplateManager 
          onClose={() => setShowManager(false)} 
          onUpdate={loadTemplates} 
        />
      )}
    </div>
  );
}
