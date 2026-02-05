import Navbar from "../components/Navbar";
import ReminderForm from "../components/ReminderForm";

const CreateReminder = () => {
    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
            <Navbar />
            <div className="container mx-auto p-6">
                <ReminderForm />
            </div>
        </div>
    );
};

export default CreateReminder;
