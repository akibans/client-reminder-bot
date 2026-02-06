import { useState, useEffect } from 'react';
import { templateApi } from '../services/templateApi';

export default function TemplateManager({ onClose, onUpdate }) {
  const [templates, setTemplates] = useState([]);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', content: '' });
  const [previewVars, setPreviewVars] = useState({});
  const [showPreview, setShowPreview] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data } = await templateApi.getAll();
      if (data.success) {
        // Filter out system defaults (users can't edit those)
        setTemplates(data.data.filter(t => !t.isDefault));
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  const extractVars = (content) => {
    if (!content) return [];
    const matches = content.match(/\{\{(\w+)\}\}/g) || [];
    return [...new Set(matches.map(m => m.replace(/[{}]/g, '')))];
  };

  const getPreview = () => {
    let preview = formData.content;
    const vars = extractVars(formData.content);
    vars.forEach(v => {
      preview = preview.replace(
        new RegExp(`\\{\\{${v}\\}\\}`, 'g'), 
        previewVars[v] || `[${v}]`
      );
    });
    return preview;
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.content.trim()) {
      setError('Please fill in both name and content');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      if (editing) {
        await templateApi.update(editing.id, formData);
      } else {
        await templateApi.create(formData);
      }
      
      setFormData({ name: '', content: '' });
      setEditing(null);
      setPreviewVars({});
      loadTemplates();
      onUpdate?.();
    } catch (err) {
      const message = err.response?.data?.error || 'Failed to save template';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    
    try {
      await templateApi.delete(id);
      loadTemplates();
      onUpdate?.();
    } catch (err) {
      setError('Failed to delete template');
    }
  };

  const handleDuplicate = async (id) => {
    try {
      await templateApi.duplicate(id);
      loadTemplates();
      onUpdate?.();
    } catch (err) {
      setError('Failed to duplicate template');
    }
  };

  const startEdit = (template) => {
    setEditing(template);
    setFormData({ name: template.name, content: template.content });
    setPreviewVars({});
    setError('');
  };

  const cancelEdit = () => {
    setEditing(null);
    setFormData({ name: '', content: '' });
    setPreviewVars({});
    setError('');
  };

  const variables = extractVars(formData.content);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-indigo-600 to-purple-600 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Template Manager</h2>
              <p className="text-indigo-100 text-sm">Create and manage message templates</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Create/Edit Form */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-5 rounded-xl border border-indigo-100 space-y-4">
            <h3 className="font-semibold text-gray-800">
              {editing ? 'Edit Template' : 'Create New Template'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Template Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Appointment Reminder"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <div className="flex items-end">
                <div className="text-xs text-gray-500 bg-white px-3 py-2 rounded-lg border border-gray-200">
                  <span className="font-semibold">Tip:</span> Use {'{{variable}}'} for dynamic content
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Message Content
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={4}
                placeholder="Hi {{name}}, this is a reminder about {{event}} on {{date}}..."
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none font-mono text-sm"
              />
              
              {/* Variable Chips */}
              {variables.length > 0 && (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-gray-500">Detected variables:</span>
                  {variables.map(v => (
                    <span key={v} className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Live Preview */}
            {formData.content && showPreview && (
              <div className="bg-white rounded-lg border border-indigo-200 overflow-hidden">
                <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-indigo-700 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Live Preview
                  </span>
                  <button 
                    type="button"
                    onClick={() => setShowPreview(false)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Hide
                  </button>
                </div>
                <div className="p-4">
                  <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                    {getPreview()}
                  </div>
                  
                  {variables.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <span className="text-xs text-gray-500 mb-2 block">Test with values:</span>
                      <div className="flex flex-wrap gap-2">
                        {variables.map(v => (
                          <input
                            key={v}
                            type="text"
                            placeholder={v}
                            value={previewVars[v] || ''}
                            onChange={(e) => setPreviewVars({ ...previewVars, [v]: e.target.value })}
                            className="w-28 px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!showPreview && formData.content && (
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className="text-xs text-indigo-600 hover:text-indigo-700"
              >
                Show preview
              </button>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg font-medium transition-all shadow-sm hover:shadow-md"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {editing ? 'Update' : 'Create'} Template
              </button>
              
              {editing && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="px-6 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          {/* Existing Templates List */}
          <div>
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              Your Templates ({templates.length})
            </h3>
            
            <div className="space-y-3">
              {templates.map(template => (
                <div 
                  key={template.id} 
                  className="group flex items-start justify-between p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800 mb-1">{template.name}</div>
                    <div className="text-sm text-gray-600 line-clamp-2">{template.content}</div>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {template.variables?.map(v => (
                        <span key={v} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                          {`{{${v}}}`}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-4">
                    <button
                      type="button"
                      onClick={() => handleDuplicate(template.id)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Duplicate"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(template)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(template.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
              
              {templates.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500 font-medium">No custom templates yet</p>
                  <p className="text-sm text-gray-400 mt-1">Create your first template above</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
