import Navbar from "../components/Navbar";
import ClientForm from "../components/ClientForm";

const AddClient = () => {
    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
            <Navbar />
            <div className="container mx-auto p-6">
                <ClientForm />
            </div>
        </div>
    );
};

export default AddClient;
