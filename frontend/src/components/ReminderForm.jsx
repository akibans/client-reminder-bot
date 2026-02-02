import { useState, useEffect } from "react";
import { createReminder, getClients } from "../services/api";
import { useNavigate, Link } from "react-router-dom";

const ReminderForm = () => {
    const [clients, setClients] = useState([]);
    const [selectedClients, setSelectedClients] = useState([]);
    const [form, setForm] = useState({ message: "", sendVia: "email", scheduleAt: "" });
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const { data } = await getClients({ limit: 1000 });
                setClients(data.clients || []);
            } catch (error) {
                console.error("Failed to fetch clients", error);
            }
        };
        fetchClients();
    }, []);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const toggleClient = (clientId) => {
        setSelectedClients(prev => 
            prev.includes(clientId) 
                ? prev.filter(id => id !== clientId) 
                : [...prev, clientId]
        );
    };

    const filteredClients = clients.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (selectedClients.length === 0) {
            alert("Please select at least one client.");
            return;
        }
        setLoading(true);
        try {
            await createReminder({ ...form, clients: selectedClients });
            navigate("/");
        } catch (error) {
            console.error("Error creating reminder", error);
            // Show detailed validation errors if available
            const errors = error.response?.data?.errors;
            const message = error.response?.data?.message || "Failed to schedule reminder";
            if (errors && errors.length > 0) {
                alert(`${message}:\n- ${errors.join('\n- ')}`);
            } else {
                alert(message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto mt-10 bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100 animate-in zoom-in">
            <div className="px-6 py-8">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900">Schedule Reminder</h2>
                    <p className="text-sm text-gray-500">Automate your client follow-ups</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reminder Message</label>
                        <textarea 
                            name="message" 
                            rows="4" 
                            required
                            onChange={handleChange} 
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition duration-150 ease-in-out"
                            placeholder="Enter your reminder message here..."
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                             <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Method</label>
                             <select 
                                name="sendVia" 
                                onChange={handleChange} 
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                             >
                                <option value="email">Email</option>
                                <option value="whatsapp">WhatsApp</option>
                             </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Schedule Time</label>
                            <input 
                                type="datetime-local" 
                                name="scheduleAt" 
                                required
                                onChange={handleChange} 
                                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" 
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-medium text-gray-700">Select Clients</label>
                            <span className="text-xs text-indigo-600 font-medium">{selectedClients.length} selected</span>
                        </div>
                        
                        <div className="mb-2">
                            <input 
                                type="text"
                                placeholder="Search clients..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="block w-full px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>

                        <div className="border border-gray-300 rounded-md overflow-hidden bg-gray-50/50">
                            <div className="max-h-48 overflow-y-auto divide-y divide-gray-200">
                                {filteredClients.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-gray-500">No matching clients found</div>
                                ) : (
                                    filteredClients.map(c => (
                                        <label 
                                            key={c.id} 
                                            className={`flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer transition-colors ${selectedClients.includes(c.id) ? 'bg-indigo-50' : ''}`}
                                        >
                                            <input 
                                                type="checkbox"
                                                checked={selectedClients.includes(c.id)}
                                                onChange={() => toggleClient(c.id)}
                                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-3"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                                                <p className="text-xs text-gray-500 truncate">{c.email}</p>
                                            </div>
                                        </label>
                                    ))
                                )}
                            </div>
                        </div>
                        <p className="mt-2 text-xs text-gray-500">Selected clients will receive this reminder via {form.sendVia}.</p>
                    </div>

                    <div className="flex flex-col space-y-3 pt-4">
                        <button 
                            type="submit" 
                            disabled={loading || clients.length === 0}
                            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${loading || clients.length === 0 ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out`}
                        >
                            {loading ? "Scheduling..." : "Schedule Reminder"}
                        </button>
                        <Link to="/" className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-150 ease-in-out">
                            Cancel
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReminderForm;
