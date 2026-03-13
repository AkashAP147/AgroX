import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Mic, X, Upload, MapPin, Loader2, Check, Volume2, Settings } from 'lucide-react';

const LANGUAGES = [
  { code: 'en-IN', name: 'English (India)', flag: '🇮🇳' },
  { code: 'hi-IN', name: 'Hindi', flag: '🇮🇳' },
  { code: 'mr-IN', name: 'Marathi', flag: '🇮🇳' },
  { code: 'kn-IN', name: 'Kannada', flag: '🇮🇳' },
  { code: 'ta-IN', name: 'Tamil', flag: '🇮🇳' },
  { code: 'te-IN', name: 'Telugu', flag: '🇮🇳' },
  { code: 'gu-IN', name: 'Gujarati', flag: '🇮🇳' },
  { code: 'bn-IN', name: 'Bengali', flag: '🇮🇳' }
];

const EXAMPLES = {
  'en-IN': 'e.g. "List 200 kg tomato at 25 rupees"',
  'hi-IN': 'जैसे "200 किलो टमाटर 25 रुपये में सूचीबद्ध करें"',
  'mr-IN': 'उदा. "200 किलो टोमॅटो 25 रुपयांना सूचीबद्ध करा"',
  'ta-IN': 'எ.கா "200 கிலோ தக்காளியை 25 ரூபாய்க்கு பட்டியலிட"',
};

export default function VoiceCropInput({ user, onCropAdded, className = '', buttonLabel = 'Voice Add' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [language, setLanguage] = useState('en-IN');
  const [showing, setShowing] = useState('mic'); // 'mic', 'form', 'settings'
  const [cropData, setCropData] = useState({
    cropName: '',
    quantity: '',
    price: '',
    location: '',
    image: null
  });
  const [loading, setLoading] = useState(false);
  const [locationDetecting, setLocationDetecting] = useState(false);
  const [message, setMessage] = useState('');
  const recognitionRef = useRef(null);
  const imageInputRef = useRef(null);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (e) => {
        setMessage(`Error: ${e.error}`);
        setIsListening(false);
      };

      recognition.onresult = (event) => {
        const text = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        setTranscript(text);
        parseTranscript(text);
      };

      recognitionRef.current = recognition;
    }
  }, [language]);

  function startListening() {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.lang = language;
      recognitionRef.current.start();
    }
  }

  function stopListening() {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      setIsListening(false);
    }
  }

  function parseTranscript(text) {
    // Parse speech: "200 kg tomato at 25 rupees"
    // Supports various formats
    const lowerText = text.toLowerCase().trim();
    
    // Extract quantity and unit
    const qtyMatch = lowerText.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilogram|kgs?|pound|gm|gram|litre?|liter?|ton|quintal|bag|crate|bunch|dozen)/i);
    let quantity = '';
    if (qtyMatch) quantity = qtyMatch[1];

    // Extract crop name (word between quantity and "at/rupee/price")
    let cropName = '';
    const afterQty = lowerText.replace(/\d+\s*(?:kg|kilogram|kgs?|pound|gm|gram|litre?|liter?|ton|quintal|bag|crate|bunch|dozen)\s*/i, '');
    const cropMatch = afterQty.match(/^([a-z\s]+?)(?:\s+at\s+|\s+for\s+|\s+rupee|\s+price|\s+₹|\s+rs\.?|\s+inr)/i);
    if (cropMatch) cropName = cropMatch[1].trim();

    // Extract price
    let price = '';
    const priceMatch = text.match(/(?:at|for|price|rupee?s?|rs\.?|₹)\s*(\d+(?:\.\d+)?)/i);
    if (priceMatch) price = priceMatch[1];

    setCropData(prev => ({
      ...prev,
      cropName: cropName || prev.cropName,
      quantity: quantity || prev.quantity,
      price: price || prev.price
    }));

    setShowing('form');
  }

  async function detectLocation() {
    setLocationDetecting(true);
    if (!navigator.geolocation) {
      setMessage('Geolocation not available');
      setLocationDetecting(false);
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          const placeName = data.address?.city || data.address?.town || data.address?.village || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          setCropData(prev => ({ ...prev, location: placeName }));
          setMessage('Location detected!');
        } catch {
          setCropData(prev => ({ ...prev, location: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` }));
        }
        setLocationDetecting(false);
      },
      () => {
        setMessage('Could not detect location');
        setLocationDetecting(false);
      }
    );
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      setCropData(prev => ({ ...prev, image: file }));
      setMessage('Image selected!');
    }
  }

  async function handleAddCrop() {
    if (!cropData.cropName || !cropData.quantity || !cropData.price) {
      setMessage('Please fill crop name, quantity, and price');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('farmerId', user._id);
      formData.append('cropName', cropData.cropName);
      formData.append('quantity', parseFloat(cropData.quantity));
      formData.append('quantityUnit', 'kg');
      formData.append('price', parseFloat(cropData.price));
      formData.append('location', cropData.location || user.location);
      formData.append('farmerName', user.name);
      
      if (cropData.image) {
        formData.append('image', cropData.image);
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/crops/create`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to add crop');
      
      const result = await response.json();
      setMessage('Crop added successfully!');
      
      // Reset
      setTranscript('');
      setCropData({ cropName: '', quantity: '', price: '', location: '', image: null });
      setShowing('mic');
      
      setTimeout(() => {
        setIsOpen(false);
        onCropAdded?.();
      }, 1500);
    } catch (err) {
      setMessage(err.message);
    }
    setLoading(false);
  }

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => {
          setIsOpen(true);
          setShowing('mic');
        }}
        className={`btn btn-secondary ${className}`}
      >
        <Mic className="w-4 h-4" /> {buttonLabel}
      </button>

      {/* Modal */}
      {isOpen && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-[2px] p-4 animate-fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-scale-in max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Header */}
            <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Voice Crop Add</h2>
              <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Settings */}
              {showing === 'settings' && (
                <>
                  <p className="text-sm text-gray-600 font-semibold mb-3">Select Language</p>
                  <div className="grid grid-cols-2 gap-2">
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code);
                          setShowing('mic');
                        }}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                          language === lang.code
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {lang.flag} {lang.name}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Mic View */}
              {showing === 'mic' && (
                <>
                  <div className="text-center py-6">
                    <button
                      onClick={isListening ? stopListening : startListening}
                      className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-lg transition-all duration-200 mb-4 ${
                        isListening
                          ? 'bg-red-500 animate-pulse shadow-lg shadow-red-300'
                          : 'bg-gradient-to-br from-primary-500 to-primary-700 hover:scale-105 shadow-lg shadow-primary-300'
                      }`}
                    >
                      <Mic className="w-10 h-10" />
                    </button>
                    <p className="text-sm text-gray-600 font-medium">
                      {isListening ? 'Listening...' : 'Tap to start speaking'}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">{EXAMPLES[language] || 'List your crop'}</p>
                  </div>

                  {transcript && (
                    <div className="bg-gray-50 rounded-xl p-3 max-h-24 overflow-y-auto">
                      <p className="text-xs text-gray-500 mb-1 font-semibold">Transcript:</p>
                      <p className="text-sm text-gray-800">{transcript}</p>
                    </div>
                  )}

                  <button
                    onClick={() => setShowing('settings')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors text-sm"
                  >
                    <Settings className="w-4 h-4" /> Language: {LANGUAGES.find(l => l.code === language)?.name}
                  </button>

                  {transcript && (
                    <button
                      onClick={() => setShowing('form')}
                      className="w-full px-4 py-2 rounded-lg bg-primary-100 hover:bg-primary-200 text-primary-700 font-medium transition-colors text-sm"
                    >
                      Continue Editing →
                    </button>
                  )}
                </>
              )}

              {/* Form View */}
              {showing === 'form' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Crop Name</label>
                    <input
                      type="text"
                      value={cropData.cropName}
                      onChange={e => setCropData(prev => ({ ...prev, cropName: e.target.value }))}
                      placeholder="e.g. Tomato"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Quantity (kg)</label>
                      <input
                        type="number"
                        value={cropData.quantity}
                        onChange={e => setCropData(prev => ({ ...prev, quantity: e.target.value }))}
                        placeholder="200"
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Price (₹)</label>
                      <input
                        type="number"
                        value={cropData.price}
                        onChange={e => setCropData(prev => ({ ...prev, price: e.target.value }))}
                        placeholder="25"
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-semibold text-gray-700">Location</label>
                      <button
                        onClick={detectLocation}
                        disabled={locationDetecting}
                        className="text-xs px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors flex items-center gap-1"
                      >
                        <MapPin className="w-3 h-3" /> {locationDetecting ? 'Detecting...' : 'Auto-detect'}
                      </button>
                    </div>
                    <input
                      type="text"
                      value={cropData.location}
                      onChange={e => setCropData(prev => ({ ...prev, location: e.target.value }))}
                      placeholder={user.location || 'Your location'}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Crop Image (Optional)</label>
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      className="w-full px-4 py-3 rounded-lg border-2 border-dashed border-primary-200 hover:border-primary-500 hover:bg-primary-50 transition-colors flex items-center justify-center gap-2 text-primary-600 font-medium"
                    >
                      <Upload className="w-4 h-4" /> {cropData.image ? cropData.image.name : 'Upload Image'}
                    </button>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </div>

                  {message && (
                    <div className={`px-3 py-2 rounded-lg text-sm ${
                      message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      {message}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowing('mic')}
                      className="flex-1 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium transition-colors text-sm"
                    >
                      ← Back
                    </button>
                    <button
                      onClick={handleAddCrop}
                      disabled={loading}
                      className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-primary-500 to-primary-700 hover:shadow-lg text-white font-medium transition-all text-sm flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Adding...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" /> Add Crop
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
