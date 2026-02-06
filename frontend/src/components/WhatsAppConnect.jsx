import { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  Loader2, 
  RefreshCw, 
  Power,
  Smartphone,
  Shield,
  AlertCircle,
  QrCode
} from 'lucide-react';

export default function WhatsAppConnect() {
  const { socket } = useSocket();
  const [status, setStatus] = useState('disconnected');
  const [qrCode, setQrCode] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!socket) return;

    // Listen for status updates
    socket.on('whatsapp:status', (data) => {
      console.log('WhatsApp Status Update:', data);
      setStatus(data.status);
      setQrCode(data.qrCode);
      if (data.user) setUserInfo(data.user);
    });

    socket.on('whatsapp:qr', (qr) => {
      console.log('QR Code Received');
      setQrCode(qr);
      setStatus('qr_ready');
      startCountdown();
    });

    socket.on('whatsapp:connected', (info) => {
      console.log('WhatsApp Connected:', info);
      setStatus('connected');
      setUserInfo(info.user);
      setQrCode(null);
      toast.success('WhatsApp connected successfully!', {
        description: `Connected as ${info.user?.name || info.user?.id}`
      });
    });

    socket.on('whatsapp:error', (error) => {
      toast.error('WhatsApp Error', { description: error });
    });

    // Get initial status
    fetchStatus();

    return () => {
      socket.off('whatsapp:status');
      socket.off('whatsapp:qr');
      socket.off('whatsapp:connected');
      socket.off('whatsapp:error');
    };
  }, [socket]);

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const fetchStatus = async () => {
    try {
      const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${BASE_URL}/api/whatsapp/status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        setStatus(data.data.status);
        setQrCode(data.data.qrCode);
        setUserInfo(data.data.user);
      }
    } catch (error) {
      console.error('Failed to fetch status:', error);
    }
  };

  const handleReconnect = async () => {
    setIsLoading(true);
    try {
      const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${BASE_URL}/api/whatsapp/reconnect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        toast.info('Generating new QR code...');
      }
    } catch (error) {
      toast.error('Failed to reconnect');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${BASE_URL}/api/whatsapp/disconnect`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Disconnected successfully');
        setUserInfo(null);
      }
    } catch (error) {
      toast.error('Failed to disconnect');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'qr_ready': return 'bg-yellow-500';
      case 'connecting': return 'bg-blue-500 animate-pulse';
      default: return 'bg-red-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected': return 'Connected';
      case 'qr_ready': return 'Waiting for QR scan';
      case 'connecting': return 'Connecting...';
      default: return 'Disconnected';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Smartphone className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold">WhatsApp Connection</h3>
              <p className="text-green-100 text-sm flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
                {getStatusText()}
              </p>
            </div>
          </div>
          
          {status === 'connected' && (
            <button
              onClick={handleDisconnect}
              disabled={isLoading}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
              title="Disconnect"
            >
              <Power className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {status === 'disconnected' && (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <QrCode className="w-10 h-10 text-gray-400" />
            </div>
            <h4 className="text-lg font-semibold text-gray-800 mb-2">Not Connected</h4>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              Connect your WhatsApp to send real messages to clients
            </p>
            <button
              onClick={handleReconnect}
              disabled={isLoading}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <RefreshCw className="w-5 h-5" />
              )}
              Connect WhatsApp
            </button>
          </div>
        )}

        {status === 'connecting' && (
          <div className="text-center py-12">
            <Loader2 className="w-16 h-16 text-green-600 animate-spin mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-gray-800 mb-2">Initializing...</h4>
            <p className="text-gray-500">Please wait while we prepare your connection</p>
          </div>
        )}

        {status === 'qr_ready' && qrCode && (
          <div className="text-center">
            <div className="inline-block p-4 bg-white rounded-2xl shadow-lg border-2 border-green-100 mb-6">
              <QRCodeSVG 
                value={qrCode} 
                size={256} 
                level="H"
                includeMargin={true}
                imageSettings={{
                  src: "/whatsapp-icon.png",
                  height: 40,
                  width: 40,
                  excavate: true,
                }}
              />
            </div>
            
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-gray-800">Scan QR Code</h4>
              <ol className="text-sm text-gray-600 space-y-2 text-left max-w-xs mx-auto">
                <li className="flex items-start gap-2">
                  <span className="bg-green-100 text-green-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
                  Open WhatsApp on your phone
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-green-100 text-green-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
                  Go to Settings → Linked Devices
                </li>
                <li className="flex items-start gap-2">
                  <span className="bg-green-100 text-green-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
                  Tap "Link a Device" and scan the code
                </li>
              </ol>
              
              {countdown > 0 && (
                <div className="flex items-center justify-center gap-2 text-sm text-yellow-600 bg-yellow-50 px-4 py-2 rounded-lg">
                  <AlertCircle className="w-4 h-4" />
                  QR expires in {countdown}s
                </div>
              )}
              
              <button
                onClick={handleReconnect}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Generate new QR
              </button>
            </div>
          </div>
        )}

        {status === 'connected' && userInfo && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl border border-green-100">
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {userInfo.name?.[0] || userInfo.id?.[0] || '?'}
              </div>
              <div>
                <h4 className="font-bold text-gray-800 text-lg">{userInfo.name || 'WhatsApp User'}</h4>
                <p className="text-gray-500 text-sm">{userInfo.id?.split(':')[0]}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Shield className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-green-700 font-medium">Connected & Ready</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <div className="text-2xl font-bold text-gray-800">Active</div>
                <div className="text-sm text-gray-500">Status</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <div className="text-2xl font-bold text-gray-800">Ready</div>
                <div className="text-sm text-gray-500">Messaging</div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Keep your phone online</p>
                  <p className="text-blue-600">Your phone needs to stay connected to the internet for WhatsApp to work.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
