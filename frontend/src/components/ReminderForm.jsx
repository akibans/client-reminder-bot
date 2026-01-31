import { useState, useEffect } from "react";
import { createReminder, getClients } from "../services/api";
import { useNavigate, Link } from "react-router-dom";

const ReminderForm = () => {
    const [clients, setClients] = useState([]);
    const [selectedClients, setSelectedClients] = useState([]);
    const [form, setForm] = useState({ message: "", sendVia: "email", scheduleAt: "" });
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const { data } = await getClients();
                setClients(data);
            } catch (error) {
                console.error("Failed to fetch clients", error);
            }
        };
        fetchClients();
    }, []);

    const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

    const handleClientSelect = (e) => {
        const options = [...e.target.selectedOptions].map(o => o.value);
        setSelectedClients(options);
    };

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
            alert("Failed to schedule reminder");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto mt-10 bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
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
                        <label className="block text-sm font-medium text-gray-700 mb-1">Select Clients</label>
                        <p className="text-xs text-gray-500 mb-2">Hold Ctrl (Cmd on Mac) to select multiple clients.</p>
                        <select 
                            multiple 
                            onChange={handleClientSelect} 
                            required
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm h-32"
                        >
                            {clients.length === 0 && <option disabled>No clients found</option>}
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
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
